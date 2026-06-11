# Changelog

All notable changes and features added to the Personal Finance App are documented in this file.

---

## [Recent Updates] - June 2026

### Added
- **Income vs. Expense Monthly Trends Toggle**:
  - Added a `[Bar | Trend]` toggle on the "Income vs Expenses" card in the Analytics page.
  - Users can switch between a side-by-side bar chart comparison and a smooth area trend projection.
- **Budget Spending Alerts**:
  - Implemented budget spending warning alerts for variable categories exceeding 85% utilization.
  - Added critical alerts for all categories (fixed and variable) exceeding 100% utilization.
  - Added overdue payment alerts for fixed expenses that remain unpaid past their designated due date.
  - Integrated a dedicated "Budget Alerts" panel in the Dashboard sidebar.
  - Added glowing card overlays, status badges, and styled table rows on the Budgets page to visually call out near-limit or exceeded budgets.
- **Debt Paydown Simulator (Snowball vs. Avalanche)**:
  - Interactive debt paydown comparison dashboard added to the Loans page.
  - Implemented client-side simulation engine projecting payoff curves for Baseline, Snowball, and Avalanche strategies.
  - Added range slider and numeric inputs to dynamically adjust extra monthly payments.
  - Embedded Recharts AreaChart comparing combined debt balance projection curves over time.
- **Credit Card Extensions**: 
  - Added support for adding child/partner extension credit cards linked to a "main" card.
  - Automatically aggregates the total spent balance across all extension cards and displays it on the main card's dashboard entry.
  - Displays extension cards with a dedicated "Extension" badge and parent card context.
- **Monthly Savings & Cash Available Analytics**:
  - Implemented new charts on the Analytics page comparing monthly savings percentage.
  - Added end-of-month cash tracking to visualize daily/liquid spending capacity trends over time.
- **Accessible App Themes**:
  - Added 3 premium accessible UI themes to address contrast and readability (supporting dark and light preferences).
  - Dynamically updates typography and layout styles globally.
- **Non-Budgeted Category Analytics**:
  - Added tracking and visualization for expenses incurred under non-budgeted categories to prevent hidden spending.
- **Interactive Tooltips**:
  - Embedded rich tooltips across dashboard graphs and account metrics to improve data clarity and user onboarding.
- **EV Charging & Utility Tracker Integration**:
  - Integrated Electric Vehicle (EV) charging log lists.
  - Built automatic utilities calculations linking utility consumption (electricity bills) with EV logs to extract EV charging cost share.
  - Added Energy Allocation and EV Cost Trend charts.
- **Liquid Assets Account Summary**:
  - Integrated a new account summary dashboard showing total liquid assets vs long-term assets.
- **Transaction Ledger Pagination**:
  - Added pagination controls to the Transactions table to support large ledger datasets.
- **Financial Calendar View**:
  - Introduced a calendar-based layout for the Payments and Upcoming Obligations timeline.
