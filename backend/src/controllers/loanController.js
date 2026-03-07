const prisma = require('../db');
const USER_ID = 'default-user-id';

/**
 * Standard amortization formula.
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * For 0% interest, M = P / n
 */
function calcMonthlyPayment(principal, annualRatePercent, termMonths) {
  if (annualRatePercent === 0) return principal / termMonths;
  const r = annualRatePercent / 100 / 12;
  const pow = Math.pow(1 + r, termMonths);
  return (principal * r * pow) / (pow - 1);
}

// GET all loans
exports.getLoans = async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: USER_ID },
      orderBy: { nextDueDate: 'asc' },
    });
    // Parse aprHistory JSON string -> array
    res.json(loans.map(l => ({ ...l, aprHistory: JSON.parse(l.aprHistory || '[]') })));
  } catch (error) {
    console.error('getLoans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
};

// POST: Create a new loan
exports.createLoan = async (req, res) => {
  try {
    const { name, originalBalance, interestRate, termMonths, insuranceCost, startDate, isVariableRate, earlyPaymentStrategy, currency } = req.body;

    if (!name || !originalBalance || !startDate) {
      return res.status(400).json({ error: 'name, originalBalance, and startDate are required' });
    }

    const parsedBalance = parseFloat(originalBalance);
    const parsedRate = parseFloat(interestRate) || 0;
    const parsedTerm = parseInt(termMonths) || 12;

    // Compute monthly payment via amortization formula
    const monthlyPayment = calcMonthlyPayment(parsedBalance, parsedRate, parsedTerm);

    // nextDueDate = 1 month after startDate
    const nextDueDate = new Date(startDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);

    const aprHistory = JSON.stringify([{ date: new Date().toISOString(), apr: parsedRate }]);

    const loan = await prisma.loan.create({
      data: {
        userId: USER_ID,
        name,
        originalBalance: parsedBalance,
        balance: parsedBalance,
        interestRate: parsedRate,
        termMonths: parsedTerm,
        monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
        insuranceCost: parseFloat(insuranceCost) || 0,
        startDate: new Date(startDate),
        nextDueDate,
        isVariableRate: Boolean(isVariableRate),
        earlyPaymentStrategy: earlyPaymentStrategy || 'reduce_term',
        aprHistory,
        currency: currency || 'USD',
      },
    });

    res.status(201).json({ ...loan, aprHistory: JSON.parse(loan.aprHistory) });
  } catch (error) {
    console.error('createLoan error:', error);
    res.status(500).json({ error: 'Failed to create loan' });
  }
};

// PUT: Update loan (name, insurance, currency, term — NOT APR directly for variable rate)
exports.updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, interestRate, termMonths, insuranceCost, startDate, isVariableRate, earlyPaymentStrategy, currency } = req.body;

    const existing = await prisma.loan.findUnique({ where: { id, userId: USER_ID } });
    if (!existing) return res.status(404).json({ error: 'Loan not found' });

    const parsedRate = parseFloat(interestRate) ?? existing.interestRate;
    const parsedTerm = parseInt(termMonths) ?? existing.termMonths;

    // Re-compute monthly payment based on current balance + updated rate/term
    const monthlyPayment = calcMonthlyPayment(existing.balance, parsedRate, parsedTerm);

    const nextDueDate = startDate
      ? (() => { const d = new Date(startDate); d.setMonth(d.getMonth() + 1); return d; })()
      : existing.nextDueDate;

    const loan = await prisma.loan.update({
      where: { id, userId: USER_ID },
      data: {
        name,
        interestRate: parsedRate,
        termMonths: parsedTerm,
        monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
        insuranceCost: parseFloat(insuranceCost) ?? existing.insuranceCost,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        nextDueDate,
        isVariableRate: isVariableRate !== undefined ? Boolean(isVariableRate) : existing.isVariableRate,
        earlyPaymentStrategy: earlyPaymentStrategy || existing.earlyPaymentStrategy,
        currency: currency || existing.currency,
      },
    });

    res.json({ ...loan, aprHistory: JSON.parse(loan.aprHistory) });
  } catch (error) {
    console.error('updateLoan error:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
};

// PATCH /:id/apr — update APR for variable-rate loans (does NOT touch paid installments)
exports.updateAPR = async (req, res) => {
  try {
    const { id } = req.params;
    const { apr } = req.body;

    if (apr === undefined || apr === null) {
      return res.status(400).json({ error: 'apr is required' });
    }

    const existing = await prisma.loan.findUnique({ where: { id, userId: USER_ID } });
    if (!existing) return res.status(404).json({ error: 'Loan not found' });
    if (!existing.isVariableRate) return res.status(400).json({ error: 'This loan has a fixed rate' });

    const parsedAPR = parseFloat(apr);

    // Append to APR history (stored as JSON string)
    const history = JSON.parse(existing.aprHistory || '[]');
    history.push({ date: new Date().toISOString(), apr: parsedAPR });

    // Recompute monthly payment based on remaining balance + new APR
    const newPayment = calcMonthlyPayment(existing.balance, parsedAPR, existing.termMonths);

    const loan = await prisma.loan.update({
      where: { id, userId: USER_ID },
      data: {
        interestRate: parsedAPR,
        monthlyPayment: parseFloat(newPayment.toFixed(2)),
        aprHistory: JSON.stringify(history),
      },
    });

    res.json({ ...loan, aprHistory: JSON.parse(loan.aprHistory) });
  } catch (error) {
    console.error('updateAPR error:', error);
    res.status(500).json({ error: 'Failed to update APR' });
  }
};

// DELETE
exports.deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.loan.delete({ where: { id, userId: USER_ID } });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteLoan error:', error);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
};
