# Personal Finance Web Application Implementation Plan

This document outlines the architecture and implementation details for the comprehensive personal finance web application.

## User Review Required
> [!IMPORTANT]
> The database schema has been updated to include multi-currency support. 
> - Every `Account`, `CreditCard`, and `Loan` will now have a `currency` field (e.g. "USD", "EUR").
> - Every `Transaction` will reflect a value in the `Account`'s localized currency, but for dashboard aggregates (like Net Worth), we will need an exchange rate strategy. 
> - A `Setting` model will be introduced to track global user preferences such as default `currency` and `language` (e.g., 'en-US', 'es-ES').
> - A `Currency` model will be introduced to allow custom user-defined currencies (CRUD capabilities for currencies).
> - The frontend will feature a new Settings view that updates global preferences, dynamically adjusting standard string and number formatting across the app. We will also add full CRUD management views for both Budget Categories and Custom Currencies.

## Proposed Changes

### Tech Stack
- **Frontend**: React.js (via Vite), React Router, Tailwind CSS, Recharts (for charts), Axios, Lucide React (icons).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (local file-based), Prisma ORM.

### Project Structure
The project will be created at `/Users/jonathan.calvo/.gemini/antigravity/scratch/personal-finance-app`.
- `/backend`: Node.js Express API.
- `/frontend`: React + Vite SPA.

### Database Schema (Prisma)
- **User**: id, name, createdAt.
- **Setting**: id, userId, defaultCurrency, language, theme (future-proofing).
- **Currency**: id, userId, code, symbol, name.
- **Account**: id, userId, name, type (checking, savings, etc.), balance, currency, institution.
- **CreditCard**: id, userId, name, limit, balance, dueDate, apr, currency.
- **Category**: id, userId, name, type (income, fixed_expense, variable_expense, etc.), color.
- **Transaction**: id, accountId, categoryId, amount, date, description, payee, type.
- **Budget**: id, userId, categoryId, amount, month, year.
- **Loan**: id, userId, name, balance, interestRate, termMonths, monthlyPayment, insuranceCost, nextDueDate, currency.

### Implementation Phases
1. **Phase 1: Foundation**: Scaffold backend and frontend, configure Tailwind, setup database.
2. **Phase 2: Core Data**: Basic CRUD for Accounts and Categories without authentication barriers for now.
3. **Phase 3: Transactions & Dashboard**: Expense tracking, basic charts on the dashboard.
4. **Phase 4: Settings & Multi-Currency Support**: Added currency tracking to models, introduced global custom settings for localization/formats, and dynamically format currency symbols on UI.
5. **Phase 5: Categories & Currencies CRUD**: Add new Currency data model, implement CRUD APIs for currencies, and build management UI pages for Categories and Currencies.
6. **Phase 6: Budgets, Credit Cards, Loans**: 
   - Add `currency` and `insuranceCost` modifications to `CreditCard` and `Loan` models.
   - Build CRUD APIs mimicking Accounts architecture.
   - Add UI Pages for Credit Cards and Loans, leveraging dynamic Multi-Currency fetching for new entries.
7. **Phase 7: Refinement & Deployment**: Polish UI, prepare production build, provide MacOS deployment guides.
8. **Phase 8: EV Charging Integration**:
   - Integrate EV charging session logs into the frontend.
   - Build a tabbed layout in `Services.jsx` for Utility Consumption vs. EV Charging.
   - Calculate EV share (%) of electricity consumption and estimated EV cost dynamically using the linked billing periods.
   - Add visual breakdowns: Electricity vs EV allocation chart and EV Cost Trend chart.
   - Build CRUD modal interface for logging and editing charging sessions.

## Proposed Changes

### Frontend Component

#### [MODIFY] [Services.jsx](file:///Users/jonathan.calvo/.gemini/antigravity/scratch/personal-finance-app/frontend/src/pages/Services.jsx)
- Implement state for tabs (`activeTab = 'utilities' | 'ev'`).
- Fetch EV logs from `/api/ev-charging` and compute metrics.
- Build the EV Charging dashboard containing:
  - Metrics cards: Total EV energy (kWh), Total EV Sessions, Avg EV Share, Total Est. EV Cost.
  - Interactive charts using Recharts:
    - Stacked Bar Chart: Energy Allocation (House vs. EV) per billing period.
    - Line/Bar Chart: EV Cost Trend over billing periods.
  - EV session ledger table (Date, Billing Period, kWh, Note, actions).
  - Modal form for EV logging (date, billingPeriod, kwh, note).
- Update the main Utility Consumption ledger:
  - For `electricity` rows, display estimated EV cost and share percentage if matching EV logs exist.

## Verification Plan
### Automated Tests
- Verification of API endpoints via curl commands to ensure GET, POST, PUT, DELETE operations on `/api/ev-charging` respond correctly.

### Manual Verification
- Start the server and frontend web app.
- Navigate to the **Services** view and check the tabbed layout.
- Log an electricity consumption record with specific values (e.g. May 2026, 400 kWh, 50,000 CRC).
- Switch to the **EV Charging** tab and log a few sessions for the same billing period (e.g. two sessions of 50 kWh each).
- Check that the estimated EV cost (¢12,500) and EV Share (25.0%) update correctly on the metrics cards, charts, and utility ledger.
