# Spendora - AI Expense Manager & Budget Assistant

> **Tagline:** *"Track Smart. Spend Better. Save More."*

Spendora is a complete, production-style, full-stack AI-powered personal and group expense management and budget assistant. It helps users track income and expenses, manage monthly budget caps with automated warning alerts, organize expense-sharing groups, optimize debt settlements with transaction minimization, and receive AI-powered financial advice and natural language assistant logs.

---

## Features

1. **Authentication & RBAC**: Salted password hashing using `bcrypt` and JWT session keys. Enforces role privileges (USER vs ADMIN) on both React pages and Flask REST endpoints.
2. **Personal ledger (CRUD)**: Independent logging of income streams and expenses. Supports sorting, searches, paginated records, and filtering.
3. **Smart Budgeting**: Establish monthly limit caps. Automatically monitors spending against caps and issues alerts (70% warning, 85% warning, and 100% exceeded warning states).
4. **Group Share splitting**: Form sharing groups. Logs joint bills using three splitting methods: equal division, custom shares, or percentage breakdowns.
5. **Settlement Engine**: Optimal cash settlement calculations pairing largest debtors with largest creditors to minimize offline transaction count. Mark settlements completed to clear balances.
6. **Reports & Analytics**: Clean visualization panels detailing monthly cash flows (Recharts BarChart), category spending shares (PieChart), and velocity trends (LineChart).
7. **AI Advisor**: Dynamic Gemini-powered observations evaluating cash flows, recommending category caps (applying standard 50-30-20 splits), and answering natural language questions.
8. **Rule-Based Fallback**: An intelligent local parser that runs statistics queries against SQL records to provide identical advice and chatbot answers if no Gemini API key is configured.
9. **Voice Assistant**: Integrated client-side Web Speech Recognition capturing speech commands (e.g., *"Add 250 rupees for food"*) and showing preview confirmation overlays.
10. **Admin Dashboard**: System administration tools showing global KPIs, user search and status toggles (activating/deactivating), system category taxonomy CRUD, and system audit trails.

---

## Project Structure

```
Spendora/
│
├── database/
│   ├── schema.sql            # Table structures
│   └── seed.sql              # Mock users, expenses, groups
│
├── backend/
│   ├── app/
│   │   ├── routes/           # Blueprint routers (auth, transactions, budgets, groups, ai, voice, admin)
│   │   ├── middleware/       # Auth guards, role checks
│   │   ├── services/         # AI models, settlements optimizer, audit logger
│   │   ├── utils/            # JWT helpers
│   │   └── db.py             # Database connector pool
│   ├── app.py                # Main Flask runner
│   ├── requirements.txt      # Backend Python dependencies
│   └── .env.example          # Environment variable template
│
└── frontend/
    ├── src/
    │   ├── components/       # Sidebar, Navbar, VoiceAssistantWidget
    │   ├── context/          # Auth context, Notification alerts context
    │   ├── pages/            # Page panels (Dashboard, Ledger, Budgets, Groups, AI, Voice, Profile)
    │   │   └── admin/        # Admin panels (Admin Dashboard, User Control, Categories, Audit Logs)
    │   ├── services/         # Axios network wrapper
    │   ├── App.jsx           # Routes configuration
    │   ├── main.jsx          # Mount entrypoint
    │   └── index.css         # Glassmorphic fintech design styles
    ├── package.json
    └── index.html            # Core index frame
```

---

## Prerequisites

Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Python](https://www.python.org/) (v3.9 or higher)
*   [MySQL Server](https://dev.mysql.com/downloads/mysql/) (v8.0 or higher)

---

## Setup & Installation

### 1. MySQL Database Setup

Log in to your MySQL terminal and run the following commands to initialize the schema and populate development seed logs:

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS spendora;"

# Import Schema
mysql -u root -p spendora < database/schema.sql

# Seed development mock data
mysql -u root -p spendora < database/seed.sql
```

### 2. Backend Configuration

Navigate to the `backend/` directory, create your local configuration from the template, and install packages:

```bash
cd backend

# Copy environment template
copy .env.example .env

# Install requirements
pip install -r requirements.txt
```

Open `.env` in a text editor and adjust MySQL parameters if necessary (e.g. `MYSQL_PASSWORD`, `MYSQL_USER`). Add a `GEMINI_API_KEY` to enable AI features (or leave it empty/default to engage the local rule-based fallback).

### 3. Frontend Configuration

Navigate to the `frontend/` directory and install JavaScript packages:

```bash
cd ../frontend

# Install dependencies (incorporating React 19 rules)
npm install --legacy-peer-deps
```

---

## Running the Application

### Start the Backend API Server

Navigate to `backend/` and run the Flask server:

```bash
cd backend
python app.py
```

The backend API will start running at `http://localhost:5000`.

### Start the Frontend Dev Server

Navigate to `frontend/` and start Vite:

```bash
cd frontend
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## Default Login Credentials

Use the following secure pre-seeded testing profile to explore the application:

*   **Standard User**:
    *   **Email:** `john@spendora.com`
    *   **Password:** `password123`

