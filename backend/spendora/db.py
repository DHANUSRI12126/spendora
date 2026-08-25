import os
import sqlite3
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path=env_path)
load_dotenv()

# Database file path — defaults to spendora.db next to app.py
_default_db = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'spendora.db')
DATABASE_PATH = os.getenv('DATABASE_PATH', _default_db)


class ContextCursor(sqlite3.Cursor):
    """Cursor that supports Python context manager protocol (`with conn.cursor() as cursor:`)."""
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class CustomConnection(sqlite3.Connection):
    """Custom SQLite Connection using ContextCursor by default."""
    def cursor(self, factory=ContextCursor):
        return super().cursor(factory=factory)


# ─────────────────────────────────────────────
# SQLite Schema (replaces database/schema.sql)
# ─────────────────────────────────────────────
SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    is_system INTEGER DEFAULT 0,
    user_id INTEGER NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (name, type, user_id)
);

CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    source TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_income_user_date ON income (user_id, date);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    category_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses (user_id, date);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2020),
    amount REAL NOT NULL CHECK (amount > 0),
    categories_budget TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, month, year)
);

CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    creator_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS group_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    paid_by_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    split_method TEXT DEFAULT 'equal',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_by_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_splits (
    group_expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK (amount >= 0),
    percentage REAL,
    PRIMARY KEY (group_expense_id, user_id),
    FOREIGN KEY (group_expense_id) REFERENCES group_expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    status TEXT DEFAULT 'pending',
    date TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    type TEXT DEFAULT 'general',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

# Default system categories seed data
SEED_CATEGORIES = [
    ('Food', 'expense', 1),
    ('Transport', 'expense', 1),
    ('Shopping', 'expense', 1),
    ('Bills', 'expense', 1),
    ('Healthcare', 'expense', 1),
    ('Education', 'expense', 1),
    ('Travel', 'expense', 1),
    ('Entertainment', 'expense', 1),
    ('Rent', 'expense', 1),
    ('Savings', 'expense', 1),
    ('Insurance', 'expense', 1),
    ('Investment', 'expense', 1),
    ('Gym', 'expense', 1),
    ('Personal Care', 'expense', 1),
    ('Gifts', 'expense', 1),
    ('Other', 'expense', 1),
    ('Salary', 'income', 1),
    ('Freelance', 'income', 1),
    ('Business', 'income', 1),
    ('Investment Returns', 'income', 1),
    ('Gift', 'income', 1),
    ('Other Income', 'income', 1),
]


def init_db():
    """
    Creates the SQLite database, applies the schema, and seeds system categories.
    Safe to call on every startup — uses IF NOT EXISTS guards.
    """
    conn = sqlite3.connect(DATABASE_PATH, factory=CustomConnection)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.executescript(SCHEMA_SQL)

    # Seed system categories if not already present
    for name, cat_type, is_system in SEED_CATEGORIES:
        conn.execute(
            """
            INSERT OR IGNORE INTO categories (name, type, is_system, user_id, status)
            VALUES (?, ?, ?, NULL, 'active')
            """,
            (name, cat_type, is_system)
        )

    # Seed default demo users if not present
    seed_users = [
        ('System Administrator', 'admin@spendora.com', '$2b$12$RjJ8ga.E4ts/2E57a1e4XOLn1DAVH9qf5uR0fYQY29ghFKkmUtz4G', 'ADMIN'),
        ('John Doe', 'john@spendora.com', '$2b$12$RjJ8ga.E4ts/2E57a1e4XOLn1DAVH9qf5uR0fYQY29ghFKkmUtz4G', 'USER'),
        ('Sarah Jenkins', 'sarah@spendora.com', '$2b$12$RjJ8ga.E4ts/2E57a1e4XOLn1DAVH9qf5uR0fYQY29ghFKkmUtz4G', 'USER'),
    ]
    for full_name, email, pass_hash, role in seed_users:
        conn.execute(
            """
            INSERT OR IGNORE INTO users (full_name, email, password_hash, role, status)
            VALUES (?, ?, ?, ?, 'active')
            """,
            (full_name, email, pass_hash, role)
        )

    conn.commit()
    conn.close()
    print(f"SQLite database initialised at: {DATABASE_PATH}")


def dict_factory(cursor, row):
    """Returns rows as plain dicts so existing route code works unchanged."""
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def get_db_connection():
    """
    Opens and returns a SQLite connection with dict-row access.
    Supports context manager on cursor() via CustomConnection & ContextCursor.
    The caller is responsible for closing the connection.
    """
    try:
        conn = sqlite3.connect(DATABASE_PATH, factory=CustomConnection)
        conn.row_factory = dict_factory
        conn.execute("PRAGMA foreign_keys = ON")
        conn.isolation_level = None  # autocommit mode
        return conn
    except Exception as e:
        print(f"Database Connection Error: {str(e)}")
        raise e
