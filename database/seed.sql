-- Seed data for Spendora SQLite Database
PRAGMA foreign_keys = OFF;

DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM settlements;
DELETE FROM expense_splits;
DELETE FROM group_expenses;
DELETE FROM group_members;
DELETE FROM groups;
DELETE FROM budgets;
DELETE FROM expenses;
DELETE FROM income;
DELETE FROM categories;
DELETE FROM users;

PRAGMA foreign_keys = ON;

-- 1. Seed Users (all passwords are 'password123' using bcrypt hash)
INSERT OR IGNORE INTO users (id, full_name, email, password_hash, role, status) VALUES
(1, 'System Administrator', 'admin@spendora.com', '$2b$12$x7/JQ.A9nPI6jP9q7WyBKeGRdIhLfyStLMAqnGL9whZvCPapB504G', 'ADMIN', 'active'),
(2, 'John Doe', 'john@spendora.com', '$2b$12$x7/JQ.A9nPI6jP9q7WyBKeGRdIhLfyStLMAqnGL9whZvCPapB504G', 'USER', 'active'),
(3, 'Sarah Jenkins', 'sarah@spendora.com', '$2b$12$x7/JQ.A9nPI6jP9q7WyBKeGRdIhLfyStLMAqnGL9whZvCPapB504G', 'USER', 'active'),
(4, 'Mike Ross', 'mike@spendora.com', '$2b$12$x7/JQ.A9nPI6jP9q7WyBKeGRdIhLfyStLMAqnGL9whZvCPapB504G', 'USER', 'active');

-- 2. Seed System Categories
INSERT OR IGNORE INTO categories (id, name, type, is_system, user_id, status) VALUES
-- Income categories
(1, 'Salary', 'income', 1, NULL, 'active'),
(2, 'Freelance', 'income', 1, NULL, 'active'),
(3, 'Business', 'income', 1, NULL, 'active'),
(4, 'Scholarship', 'income', 1, NULL, 'active'),
(5, 'Gift', 'income', 1, NULL, 'active'),
(6, 'Other', 'income', 1, NULL, 'active'),
-- Expense categories
(7, 'Food', 'expense', 1, NULL, 'active'),
(8, 'Transport', 'expense', 1, NULL, 'active'),
(9, 'Shopping', 'expense', 1, NULL, 'active'),
(10, 'Bills', 'expense', 1, NULL, 'active'),
(11, 'Healthcare', 'expense', 1, NULL, 'active'),
(12, 'Education', 'expense', 1, NULL, 'active'),
(13, 'Travel', 'expense', 1, NULL, 'active'),
(14, 'Entertainment', 'expense', 1, NULL, 'active'),
(15, 'Rent', 'expense', 1, NULL, 'active'),
(16, 'Other', 'expense', 1, NULL, 'active'),
(17, 'Savings', 'expense', 1, NULL, 'active'),
(18, 'Insurance', 'expense', 1, NULL, 'active'),
(19, 'Investment', 'expense', 1, NULL, 'active'),
(20, 'Gym', 'expense', 1, NULL, 'active'),
(21, 'Personal Care', 'expense', 1, NULL, 'active'),
(22, 'Gifts', 'expense', 1, NULL, 'active');
