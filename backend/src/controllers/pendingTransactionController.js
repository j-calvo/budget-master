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
      destinationAccountId,
      categoryId,
      creditCardId,
      type,
      description,
      amount,
      destinationAmount,
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

    if (type === 'transfer') {
      if (!accountId || (!destinationAccountId && !creditCardId)) {
        return res.status(400).json({ error: 'Transfers require a source account and a destination account or credit card' });
      }
      if (destinationAccountId && accountId === destinationAccountId) {
        return res.status(400).json({ error: 'Cannot transfer to the same account' });
      }

      const sourceAccount = await prisma.account.findUnique({ where: { id: accountId } });
      if (!sourceAccount || sourceAccount.familyId !== familyId) {
        return res.status(403).json({ error: 'Unauthorized or source account not found' });
      }

      let destAccount = null;
      let destCard = null;
      if (destinationAccountId) {
        destAccount = await prisma.account.findUnique({ where: { id: destinationAccountId } });
        if (!destAccount || destAccount.familyId !== familyId) {
          return res.status(403).json({ error: 'Unauthorized or destination account not found' });
        }
      } else if (creditCardId) {
        destCard = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
        if (!destCard || destCard.familyId !== familyId) {
          return res.status(403).json({ error: 'Unauthorized or credit card not found' });
        }
      }

      const sourceAmount = (amount !== undefined && amount !== null && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0)
        ? parseFloat(amount)
        : pending.amount;
      const destAmount = (destinationAmount !== undefined && destinationAmount !== null && !isNaN(parseFloat(destinationAmount)) && parseFloat(destinationAmount) > 0)
        ? parseFloat(destinationAmount)
        : ((convertedAmount !== undefined && convertedAmount !== null && !isNaN(parseFloat(convertedAmount)) && parseFloat(convertedAmount) > 0)
          ? parseFloat(convertedAmount)
          : sourceAmount);

      const srcCurrency = sourceAccount.currency || 'USD';
      const dstCurrency = destAccount?.currency || destCard?.currency || srcCurrency;
      let finalRate = exchangeRate !== undefined && exchangeRate !== null && exchangeRate !== ''
        ? parseFloat(parseFloat(exchangeRate).toFixed(6))
        : null;
      if (srcCurrency !== dstCurrency && !finalRate && sourceAmount > 0 && destAmount > 0) {
        const rawRate = sourceAmount >= destAmount ? (sourceAmount / destAmount) : (destAmount / sourceAmount);
        finalRate = parseFloat(rawRate.toFixed(6));
      }

      let createdTx;
      await prisma.$transaction(async (tx) => {
        createdTx = await tx.transaction.create({
          data: {
            accountId,
            destinationAccountId: destinationAccountId || null,
            creditCardId: creditCardId || null,
            categoryId: categoryId || null,
            amount: sourceAmount,
            destinationAmount: destAmount,
            exchangeRate: finalRate,
            settlementStatus: 'SETTLED',
            settledAt: new Date(),
            date: pending.date,
            description: description || pending.merchantDescription,
            type: 'transfer'
          },
          include: { category: true, account: true, destinationAccount: true, creditCard: true }
        });

        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: Math.abs(sourceAmount) } }
        });

        if (destinationAccountId) {
          await tx.account.update({
            where: { id: destinationAccountId },
            data: { balance: { increment: Math.abs(destAmount) } }
          });
        } else if (creditCardId) {
          await tx.creditCard.update({
            where: { id: creditCardId },
            data: { balance: { decrement: Math.abs(destAmount) } }
          });
        }

        await tx.pendingTransaction.update({
          where: { id },
          data: { status: 'APPROVED' }
        });
      });

      return res.json({ message: 'Transaction approved successfully', transaction: createdTx });
    }

    // Determine target account/card currency
    let targetCurrency = 'USD';
    let targetAccount = null;
    let targetCreditCard = null;

    if (accountId) {
      targetAccount = await prisma.account.findUnique({ where: { id: accountId } });
      if (!targetAccount || targetAccount.familyId !== familyId) {
        return res.status(403).json({ error: 'Unauthorized or account not found' });
      }
      targetCurrency = targetAccount.currency;
    } else if (creditCardId) {
      targetCreditCard = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
      if (!targetCreditCard || targetCreditCard.familyId !== familyId) {
        return res.status(403).json({ error: 'Unauthorized or credit card not found' });
      }
      targetCurrency = targetCreditCard.currency;
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
          categoryId: categoryId || null,
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
