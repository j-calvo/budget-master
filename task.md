# Personal Finance Application Tasks

## 0. Validation (Current Feature Health Check)
- [x] **App startup** — Backend and frontend start without errors
- [x] **Settings**
  - [x] Load Settings page
  - [x] Change default currency and language, save, verify persistence
- [x] **Currencies CRUD**
  - [x] View currencies list
  - [x] Create a new currency
  - [x] Edit an existing currency
  - [x] Delete a currency
- [x] **Categories CRUD**
  - [x] View categories list
  - [x] Create a new category
  - [x] Edit an existing category
  - [x] Delete a category
- [x] **Bank Accounts CRUD**
  - [x] View accounts list
  - [x] Create a new account (with currency)
  - [x] Edit an existing account
  - [x] Delete an account
- [x] **Transactions**
  - [x] View transaction list
  - [x] Create a new transaction (income and expense)
  - [x] Edit a transaction
  - [x] Delete a transaction
  - [x] Verify account balance updates on create/edit/delete
- [x] **Budgets**
  - [x] View budget list
  - [x] Create a new budget entry
  - [x] Edit a budget entry
  - [x] Delete a budget entry
- [x] **Credit Cards CRUD**
  - [x] View credit cards list
  - [x] Create a new credit card (with currency)
  - [x] Edit a credit card
  - [x] Delete a credit card
- [x] **Loans CRUD & Payments**
  - [x] View loans list
  - [x] Create a new loan (with currency)
  - [x] Edit a loan
  - [x] Delete a loan
  - [x] View amortization schedule
  - [x] Register a loan payment (regular and early principal)

## 1. Dashboard Upgrade
- [x] Fetch account balances to calculate Net Worth
- [x] Fetch transactions to calculate This Month's Income & Expenses
- [x] Fetch credit card limit/balance to assist Net Worth calculation
- [x] Calculate Savings Rate = (Income - Expense) / Income
- [x] Display a Cash Flow chart (past 6 months)
- [x] Display top 5 recent transactions

## 2. Analytics/Reporting Page
- [x] Create an `Analytics.jsx` page and add to routing/sidebar
- [x] Build Pie Chart: Spending by Category
- [x] Build Bar Chart: Income vs Expense Trend
- [x] Build list: Breakdown of Top Largest Expenses
- [x] Add basic filters: 1M, 3M, 6M, 1Y, ALL

## 1. Planning and Setup
- [x] Create implementation plan
- [x] Initialize project directory and git repository
- [x] Initialize backend (Node.js + Express)
- [x] Initialize frontend (React + Tailwind)
- [x] Setup SQLite database and Prisma ORM

## 2. Backend Development (MVP)
- [x] Define database schema (Users, Accounts, Transactions, Categories)
- [x] Create API endpoints for Accounts
- [x] Create API endpoints for Categories & Budgets
- [x] Create API endpoints for Transactions/Expenses

## 3. CSV Import/Export
- [x] Create backend POST `/api/transactions/import` endpoint
- [x] Use `csv-parser` to parse and map fields to schema
- [x] Create backend GET `/api/transactions/export` endpoint
- [x] Use `json2csv` to format data
- [x] Add Import/Export buttons to `Transactions.jsx` UI

## 3. Frontend Development (MVP)
- [x] Setup routing and core layout (Sidebar, Navbar)
- [x] Develop Dashboard (Overview, Charts)
- [x] Develop Account Management page
- [x] Develop Expense Tracking interface
- [x] Develop Budget System interface

## 4. Settings & Multi-Currency Support
- [x] Update Prisma schema with currency field on Account
- [x] Add `Setting` model to Prisma schema for global prefs
- [x] Implement Settings API endpoints (GET, PUT)
- [x] Build global `SettingsContext` in React for state injection
- [x] Implement Settings Page UI
- [x] Pass localized context values to all numeral formatting components

## 5. Categories & Currencies CRUD
- [x] Add `Currency` model to Prisma schema and run migration
- [x] Implement Currency API endpoints (GET, POST, PUT, DELETE)
- [x] Implement Categories Management UI (Frontend CRUD)
- [x] Implement Currencies Management UI (Frontend CRUD)
- [x] Wire Settings and Accounts components to fetch DB currencies instead of hardcoding

## 6. Advanced Features
- [x] **Schema & Database Updates**
  - [x] Add `currency` column to `CreditCard` model
  - [x] Add `currency` and `insuranceCost` columns to `Loan` model
- [x] **Credit Card Management**
  - [x] Create `creditCardController.js` and `creditCardRoutes.js`
  - [x] Build Credit Card Frontend UI with Currency Dropdown Integration
- [x] **Loan Tracking**
  - [x] Create `loanController.js` and `loanRoutes.js`
  - [x] Build Loan Frontend UI Tracker with Currency Dropdown Integration
  - [x] Add `LoanPayment` model (installments + early principal payments)
  - [x] Create `loanPaymentController.js` and `loanPaymentRoutes.js`
  - [x] Build amortization schedule UI and payment log panel
- [x] Advanced Reporting and Analytics (Budgets vs Spends)
- [x] Data Import/Export (CSV)
- [x] **Internationalization (Spanish Support)**
  - [x] Configure i18next and dictionaries
  - [x] Translate Dashboard, Accounts, Transactions, Budgets, Credit Cards, Loans, Analytics
  - [x] Language persistence via SettingsContext

## 7. Deployment Preparation (MacOS)
- [x] Configure environment variables
- [x] Setup PM2 ecosystem file
- [x] Write deployment setup documentation
