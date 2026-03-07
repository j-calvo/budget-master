const prisma = require('../db');

// GET all payments for a loan
exports.getLoanPayments = async (req, res) => {
  try {
    const { loanId } = req.params;
    const payments = await prisma.loanPayment.findMany({
      where: { loanId },
      orderBy: { paymentDate: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    console.error('getLoanPayments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// POST: Register a payment (installment or early_payment)
exports.createLoanPayment = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { type, amount, principal, interest, insuranceCost, paymentDate, notes } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ error: 'Type and amount are required' });
    }

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const parsedPrincipal = parseFloat(principal) || parseFloat(amount) || 0;

    const payment = await prisma.loanPayment.create({
      data: {
        loanId,
        type,
        amount: parseFloat(amount),
        principal: parsedPrincipal,
        interest: parseFloat(interest) || 0,
        insuranceCost: parseFloat(insuranceCost) || 0,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes: notes || '',
      },
    });

    // Reduce the loan balance by the principal portion
    const newBalance = Math.max(0, loan.balance - parsedPrincipal);
    await prisma.loan.update({
      where: { id: loanId },
      data: { balance: newBalance },
    });

    res.status(201).json({ payment, newBalance });
  } catch (error) {
    console.error('createLoanPayment error:', error);
    res.status(500).json({ error: 'Failed to register payment' });
  }
};

// DELETE: Remove a payment and restore the loan balance
exports.deleteLoanPayment = async (req, res) => {
  try {
    const { loanId, paymentId } = req.params;

    const payment = await prisma.loanPayment.findUnique({ where: { id: paymentId } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    await prisma.loanPayment.delete({ where: { id: paymentId } });

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (loan) {
      await prisma.loan.update({
        where: { id: loanId },
        data: { balance: loan.balance + payment.principal },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('deleteLoanPayment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
};

/**
 * GET: Compute full amortization schedule, incorporating early payments.
 *
 * Strategy:
 *  reduce_term    — keep effectivePayment constant; loan ends sooner.
 *  reduce_payment — after each early payment, recompute effectivePayment
 *                   from (newBalance, rate, remainingMonths) so term stays
 *                   the same but each subsequent installment is lower.
 */
exports.getAmortizationSchedule = async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const registeredPayments = await prisma.loanPayment.findMany({
      where: { loanId },
      orderBy: { paymentDate: 'asc' },
    });

    const earlyPayments = registeredPayments.filter(p => p.type === 'early_payment');
    const installments  = registeredPayments.filter(p => p.type === 'installment');

    const {
      originalBalance,
      interestRate,
      termMonths,
      monthlyPayment,
      insuranceCost,
      startDate,
      earlyPaymentStrategy,
    } = loan;

    const monthlyRate  = interestRate / 100 / 12;
    const schedule     = [];

    let remainingBalance = originalBalance;
    let effectivePayment = monthlyPayment; // may change under reduce_payment
    let remainingMonths  = termMonths;
    let earlyPayIdx      = 0;
    let installmentMonth = 0;

    for (let month = 1; month <= termMonths && remainingBalance > 0.01; month++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + month);
      const dueDateStr = dueDate.toISOString().slice(0, 10);

      const prevDate = new Date(startDate);
      prevDate.setMonth(prevDate.getMonth() + month - 1);

      // ------ Inject early payments that fall in this window ------
      while (
        earlyPayIdx < earlyPayments.length &&
        new Date(earlyPayments[earlyPayIdx].paymentDate) > prevDate &&
        new Date(earlyPayments[earlyPayIdx].paymentDate) <= dueDate
      ) {
        const ep = earlyPayments[earlyPayIdx];
        const epPrincipal = ep.principal > 0 ? ep.principal : ep.amount;
        remainingBalance = Math.max(0, remainingBalance - epPrincipal);

        schedule.push({
          rowType: 'early_payment',
          id: ep.id,
          date: new Date(ep.paymentDate).toISOString().slice(0, 10),
          amount: ep.amount,
          principal: parseFloat(epPrincipal.toFixed(2)),
          interest: 0,
          insurance: 0,
          balance: parseFloat(remainingBalance.toFixed(2)),
          notes: ep.notes || '',
          strategy: earlyPaymentStrategy,
        });

        // ---- Strategy branch ----
        if (earlyPaymentStrategy === 'reduce_payment' && remainingMonths > 0 && remainingBalance > 0.01) {
          // Recompute monthly payment so term stays the same but payments shrink
          if (monthlyRate === 0) {
            effectivePayment = remainingBalance / remainingMonths;
          } else {
            const pow = Math.pow(1 + monthlyRate, remainingMonths);
            effectivePayment = (remainingBalance * monthlyRate * pow) / (pow - 1);
          }
        }
        // For reduce_term: effectivePayment stays unchanged → loan ends sooner

        earlyPayIdx++;
        if (remainingBalance <= 0.01) break;
      }

      if (remainingBalance <= 0.01) break;

      // ------ Standard installment ------
      installmentMonth++;
      remainingMonths = Math.max(1, termMonths - installmentMonth + 1);

      const interestCharge  = remainingBalance * monthlyRate;
      const principalPayment = Math.min(
        Math.max(0, effectivePayment - interestCharge),
        remainingBalance
      );
      const totalPayment = principalPayment + interestCharge + insuranceCost;
      remainingBalance = Math.max(0, remainingBalance - principalPayment);

      const dueDateYM = dueDateStr.slice(0, 7);
      const isPaid = installments.some(p =>
        new Date(p.paymentDate).toISOString().slice(0, 7) === dueDateYM
      );

      schedule.push({
        rowType: 'installment',
        month: installmentMonth,
        dueDate: dueDateStr,
        payment: parseFloat(totalPayment.toFixed(2)),
        principal: parseFloat(principalPayment.toFixed(2)),
        interest: parseFloat(interestCharge.toFixed(2)),
        insurance: parseFloat(insuranceCost.toFixed(2)),
        balance: parseFloat(remainingBalance.toFixed(2)),
        isPaid,
      });
    }

    // Remaining early payments after schedule ends
    while (earlyPayIdx < earlyPayments.length) {
      const ep = earlyPayments[earlyPayIdx];
      const epPrincipal = ep.principal > 0 ? ep.principal : ep.amount;
      remainingBalance = Math.max(0, remainingBalance - epPrincipal);
      schedule.push({
        rowType: 'early_payment',
        id: ep.id,
        date: new Date(ep.paymentDate).toISOString().slice(0, 10),
        amount: ep.amount,
        principal: parseFloat(epPrincipal.toFixed(2)),
        interest: 0,
        insurance: 0,
        balance: parseFloat(remainingBalance.toFixed(2)),
        notes: ep.notes || '',
        strategy: earlyPaymentStrategy,
      });
      earlyPayIdx++;
    }

    res.json({ loan, schedule });
  } catch (error) {
    console.error('getAmortizationSchedule error:', error);
    res.status(500).json({ error: 'Failed to compute schedule' });
  }
};

