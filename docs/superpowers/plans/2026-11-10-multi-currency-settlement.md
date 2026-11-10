# Multi-Currency Settlement & Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable seamless handling of foreign currency purchases (e.g. vouchers in EUR settling in USD) with live exchange rate estimates at approval and manual settlement reconciliation against bank statements.

**Architecture:** Extend Prisma `Transaction` with backward-compatible nullable fields (`originalAmount`, `originalCurrency`, `exchangeRate`, `settlementStatus`, `settledAt`). Enhance `InboxQueue` to detect currency mismatches between voucher currency and target account/card currency, compute an estimated conversion using `currencyService`, and save as `PENDING_SETTLEMENT`. Add a settle transaction API endpoint and a dedicated Reconciliation Modal in `Transactions.jsx` allowing users to record the exact statement USD amount, which automatically reconciles the account/card balance delta and marks the transaction `SETTLED`.

**Tech Stack:** Node.js, Express, Prisma ORM, SQLite, React, Tailwind CSS, Lucide Icons, i18next.

**Spec:** Direct user request: Implement multi-currency voucher capture (Stage A) and manual statement settlement reconciliation (Stage B), excluding Stage C (automated statement sync).

## Global Constraints
- Database changes must be non-breaking and backward compatible (nullable columns or safe defaults for existing rows).
- Card and account balances must always be tracked in their native currency.
- All monetary math when updating balances during settlement must accurately handle the delta between estimated and final amounts.
- Support both English and Spanish translations via `frontend/src/i18n.js`.

## Review Focus
- Approving a transaction where voucher currency == card currency must behave identically to the existing workflow (`SETTLED`, no conversion prompt).
- Approving a transaction where voucher currency != card currency must compute realistic estimated converted amount and record both currencies.
- Settling a transaction must correctly adjust the card or account balance by the exact delta between final statement amount and previous estimated amount.
- Re-editing a settled or pending transaction must keep balance calculations consistent.
- Filter and search on the Transactions page must work seamlessly with the new status and foreign currency indicators.

---

### Task 1: Database Schema Update & Prisma Client Generation
**Files:**
- Modify: `backend/prisma/schema.prisma`
- Verify: `npx prisma db push` and `npx prisma generate` in `backend`

**Step-by-step:**
- [ ] Add optional fields to `Transaction` model in `backend/prisma/schema.prisma`:
  - `originalAmount Float?`
  - `originalCurrency String?`
  - `exchangeRate Float?`
  - `settlementStatus String @default("SETTLED")`
  - `settledAt DateTime?`
- [ ] Run `npx prisma db push` in `backend` to apply schema change without data loss.
- [ ] Run `npx prisma generate` to refresh Prisma client types.
- [ ] Commit database schema changes.

---

### Task 2: Backend API Support for Currency Conversion & Transaction Settlement
**Files:**
- Modify: `backend/src/controllers/pendingTransactionController.js`
- Modify: `backend/src/controllers/transactionController.js`
- Modify: `backend/src/routes/transactionRoutes.js`
- Create verification test: `backend/test-settlement.js`

**Step-by-step:**
- [ ] Update `pendingTransactionController.approveTransaction`:
  - Accept optional `convertedAmount`, `originalAmount`, `originalCurrency`, `exchangeRate`, `settlementStatus`.
  - If target account/card has a different currency than `pending.currency` (or if `convertedAmount` provided):
    - Use `convertedAmount` as `amount` for the transaction and balance updates.
    - Set `originalAmount: pending.amount` (or provided), `originalCurrency: pending.currency`, `exchangeRate`, `settlementStatus: 'PENDING_SETTLEMENT'`.
  - If currencies match:
    - Save as `SETTLED` with standard `amount: pending.amount`.
- [ ] Add `settleTransaction` in `backend/src/controllers/transactionController.js`:
  - Verify user authorization for transaction.
  - Calculate delta: `newAmount - oldTx.amount`.
  - Atomically update transaction:
    - `amount: newAmount`
    - `exchangeRate: newAmount / (oldTx.originalAmount || 1)`
    - `settlementStatus: 'SETTLED'`
    - `settledAt: new Date()`
  - Adjust account or credit card balance by delta (for expense: increment card balance or decrement account balance by delta).
- [ ] Register `POST /api/transactions/:id/settle` in `backend/src/routes/transactionRoutes.js`.
- [ ] Create and run `backend/test-settlement.js` to verify math, balance adjustments, and database updates.
- [ ] Commit backend API changes.

---

### Task 3: Inbox Queue Multi-Currency Preview & Approval UI
**Files:**
- Modify: `frontend/src/components/InboxQueue.jsx`
- Modify: `frontend/src/i18n.js`

**Step-by-step:**
- [ ] Fetch or accept exchange rates in `InboxQueue.jsx` using `api.get('/currencies/rates')`.
- [ ] In `PendingCard`, detect when `targetCurrency` (from selected card/account) differs from `tx.currency`.
- [ ] Display conversion preview:
  - Original voucher amount: e.g. `€50.00 EUR`.
  - Converted amount: `≈ $54.50 USD (Est. rate 1.090)`.
  - Editable input for the estimated card amount with live rate indicator.
  - Informative badge: "Foreign currency purchase — will be saved as Pending Settlement".
- [ ] When approving, pass `convertedAmount`, `originalAmount`, `originalCurrency`, and `settlementStatus: 'PENDING_SETTLEMENT'`.
- [ ] Add i18n translation keys in `frontend/src/i18n.js` (English & Spanish).
- [ ] Commit frontend InboxQueue updates.

---

### Task 4: Transactions Page Settlement Reconciliation UI
**Files:**
- Modify: `frontend/src/pages/Transactions.jsx`
- Modify: `frontend/src/i18n.js`

**Step-by-step:**
- [ ] In `Transactions.jsx` table & mobile views, render settlement badges:
  - If `tx.settlementStatus === 'PENDING_SETTLEMENT'`:
    - Display amber badge `⏳ Est. (EUR 50.00)` next to the amount.
    - Render a prominent **"Settle"** action button (e.g., checkmark / scale icon).
  - If `tx.settlementStatus === 'SETTLED'` and `tx.originalCurrency && tx.originalCurrency !== cardCurrency`:
    - Display subtle pill showing original currency: e.g., `(orig. €50.00 @ 1.096)`.
- [ ] Add `SettleModal` component:
  - Shows original voucher amount & currency.
  - Shows previously estimated USD amount.
  - Input field for final statement amount in USD.
  - Live preview of the difference/adjustment (`+$0.30`) and effective rate (`1 EUR = $1.096 USD`).
  - Submit button to call `/api/transactions/:id/settle`.
- [ ] Update filter options or tab to optionally filter by `Pending Settlement`.
- [ ] Add translation strings to `frontend/src/i18n.js`.
- [ ] Commit frontend Transactions UI updates.

---

### Task 5: End-to-End Verification & Build
**Files:**
- Run: `npm run build --prefix frontend`
- Run test script verifying end-to-end flow
- Verify UI and clean up test artifacts

**Step-by-step:**
- [ ] Run full frontend production build (`npm run build`).
- [ ] Verify node syntax across all modified backend files.
- [ ] Clean up temporary test scripts.
- [ ] Review git diff and ensure branch is clean and ready.

