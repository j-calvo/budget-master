const prisma = require('../db');
const currencyService = require('../services/currencyService');

exports.getPendingTransactions = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const pending = await prisma.pendingTransaction.findMany({
      where: { familyId, status: 'PENDING' },
      orderBy: { date: 'desc' }
    });
    res.json(pending);
  } catch (error) {
    console.error('getPendingTransactions error:', error);
    res.status(500).json({ error: 'Failed to fetch pending transactions' });
  }
};

exports.approveTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      accountId,
      categoryId,
      creditCardId,
      type,
      description,
      convertedAmount,
      originalAmount,
      originalCurrency,
      exchangeRate,
      settlementStatus
    } = req.body;
    const familyId = req.user.familyId;

    const pending = await prisma.pendingTransaction.findUnique({ where: { id } });
    if (!pending || pending.familyId !== familyId) {
      return res.status(404).json({ error: 'Pending transaction not found' });
    }

    if (pending.status !== 'PENDING') {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    // Determine target account/card currency
    let targetCurrency = 'USD';
    let targetAccount = null;
    let targetCreditCard = null;

    if (accountId) {
      targetAccount = await prisma.account.findUnique({ where: { id: accountId } });
      if (targetAccount) targetCurrency = targetAccount.currency;
    } else if (creditCardId) {
      targetCreditCard = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
      if (targetCreditCard) targetCurrency = targetCreditCard.currency;
    }

    const pendingCurrency = pending.currency || 'USD';
    const isForeign = pendingCurrency.toUpperCase() !== targetCurrency.toUpperCase();

    let finalAmount = pending.amount;
    let finalOriginalAmount = null;
    let finalOriginalCurrency = null;
    let finalRate = null;
    let finalStatus = 'SETTLED';

    if (isForeign) {
      if (convertedAmount && !isNaN(parseFloat(convertedAmount)) && parseFloat(convertedAmount) > 0) {
        finalAmount = parseFloat(convertedAmount);
      } else {
        // Fallback: convert server-side using current exchange rates
        finalAmount = await currencyService.convert(pending.amount, pendingCurrency, targetCurrency);
      }
      finalOriginalAmount = originalAmount !== undefined && !isNaN(parseFloat(originalAmount))
        ? parseFloat(originalAmount)
        : pending.amount;
      finalOriginalCurrency = originalCurrency || pendingCurrency;
      finalRate = exchangeRate || (finalOriginalAmount > 0 ? (finalAmount / finalOriginalAmount) : 1);
      finalStatus = settlementStatus || 'PENDING_SETTLEMENT';
    } else {
      // Domestic / same currency
      finalAmount = pending.amount;
      finalOriginalAmount = null;
      finalOriginalCurrency = null;
      finalRate = 1.0;
      finalStatus = 'SETTLED';
    }

    // Wrap in transaction for atomicity
    let createdTx;
    await prisma.$transaction(async (tx) => {
      // Create actual transaction
      createdTx = await tx.transaction.create({
        data: {
          accountId: accountId || null,
          creditCardId: creditCardId || null,
          categoryId,
          amount: finalAmount,
          originalAmount: finalOriginalAmount,
          originalCurrency: finalOriginalCurrency,
          exchangeRate: finalRate ? parseFloat(finalRate.toFixed(6)) : null,
          settlementStatus: finalStatus,
          settledAt: finalStatus === 'SETTLED' ? new Date() : null,
          date: pending.date,
          description: description || pending.merchantDescription,
          type: type || 'expense'
        }
      });

      // Update balances using finalAmount in native card/account currency
      if (accountId) {
        const account = await tx.account.findUnique({ where: { id: accountId } });
        if (account) {
          const newBalance = type === 'expense' || type === 'transfer'
            ? account.balance - finalAmount
            : account.balance + finalAmount;
          await tx.account.update({
            where: { id: accountId },
            data: { balance: newBalance }
          });
        }
      } else if (creditCardId) {
        const cc = await tx.creditCard.findUnique({ where: { id: creditCardId } });
        if (cc) {
          const newBalance = type === 'expense'
            ? cc.balance + finalAmount
            : cc.balance - finalAmount;
          await tx.creditCard.update({
            where: { id: creditCardId },
            data: { balance: newBalance }
          });
        }
      }

      // Mark pending as Approved
      await tx.pendingTransaction.update({
        where: { id },
        data: { status: 'APPROVED' }
      });
    });

    res.json({ message: 'Transaction approved successfully', transaction: createdTx });
  } catch (error) {
    console.error('approveTransaction error:', error);
    res.status(500).json({ error: 'Failed to approve transaction' });
  }
};

exports.discardTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const familyId = req.user.familyId;

    const pending = await prisma.pendingTransaction.findUnique({ where: { id } });
    if (!pending || pending.familyId !== familyId) {
      return res.status(404).json({ error: 'Pending transaction not found' });
    }

    await prisma.pendingTransaction.update({
      where: { id },
      data: { status: 'REJECTED' }
    });

    res.json({ message: 'Transaction discarded' });
  } catch (error) {
    console.error('discardTransaction error:', error);
    res.status(500).json({ error: 'Failed to discard transaction' });
  }
};
