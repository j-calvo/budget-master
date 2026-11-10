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
      settlementStatus,
      extraIva,
      ivaRate = 13,
      ivaAmount,
      ivaConvertedAmount,
      ivaOriginalAmount,
      ivaCategoryId,
      ivaDescription
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

    // Calculate Extra IVA if requested
    let finalIvaAmount = 0;
    let finalIvaOriginalAmount = null;
    let finalIvaOriginalCurrency = null;
    let finalIvaRate = null;
    let finalIvaStatus = 'SETTLED';
    const ratePercent = parseFloat(ivaRate) > 0 ? parseFloat(ivaRate) : 13;
    const rateFactor = ratePercent / 100;

    if (extraIva) {
      if (isForeign) {
        if (ivaConvertedAmount && !isNaN(parseFloat(ivaConvertedAmount)) && parseFloat(ivaConvertedAmount) > 0) {
          finalIvaAmount = parseFloat(ivaConvertedAmount);
        } else {
          finalIvaAmount = parseFloat((finalAmount * rateFactor).toFixed(2));
        }

        if (ivaOriginalAmount && !isNaN(parseFloat(ivaOriginalAmount)) && parseFloat(ivaOriginalAmount) > 0) {
          finalIvaOriginalAmount = parseFloat(ivaOriginalAmount);
        } else if (finalOriginalAmount) {
          finalIvaOriginalAmount = parseFloat((finalOriginalAmount * rateFactor).toFixed(2));
        }

        finalIvaOriginalCurrency = finalOriginalCurrency;
        finalIvaRate = finalRate;
        finalIvaStatus = finalStatus;
      } else {
        if (ivaAmount && !isNaN(parseFloat(ivaAmount)) && parseFloat(ivaAmount) > 0) {
          finalIvaAmount = parseFloat(ivaAmount);
        } else {
          finalIvaAmount = parseFloat((finalAmount * rateFactor).toFixed(2));
        }
        finalIvaOriginalAmount = null;
        finalIvaOriginalCurrency = null;
        finalIvaRate = 1.0;
        finalIvaStatus = 'SETTLED';
      }
    }

    // Wrap in transaction for atomicity
    let createdTx;
    let createdIvaTx = null;
    await prisma.$transaction(async (tx) => {
      // Create main transaction
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

      // Create extra IVA transaction if requested
      if (extraIva && finalIvaAmount > 0) {
        const txDesc = description || pending.merchantDescription;
        const defaultIvaDesc = `IVA (${ratePercent}%) - ${txDesc}`;
        createdIvaTx = await tx.transaction.create({
          data: {
            accountId: accountId || null,
            creditCardId: creditCardId || null,
            categoryId: ivaCategoryId || categoryId,
            amount: finalIvaAmount,
            originalAmount: finalIvaOriginalAmount,
            originalCurrency: finalIvaOriginalCurrency,
            exchangeRate: finalIvaRate ? parseFloat(finalIvaRate.toFixed(6)) : null,
            settlementStatus: finalIvaStatus,
            settledAt: finalIvaStatus === 'SETTLED' ? new Date() : null,
            date: pending.date,
            description: ivaDescription || defaultIvaDesc,
            type: 'expense'
          }
        });
      }

      // Update balances using finalAmount and finalIvaAmount in native card/account currency
      const totalExpenseAmount = finalAmount + (extraIva ? finalIvaAmount : 0);

      if (accountId) {
        const account = await tx.account.findUnique({ where: { id: accountId } });
        if (account) {
          let balanceDelta;
          if (type === 'expense' || type === 'transfer') {
            balanceDelta = -totalExpenseAmount;
          } else {
            balanceDelta = finalAmount - (extraIva ? finalIvaAmount : 0);
          }
          await tx.account.update({
            where: { id: accountId },
            data: { balance: account.balance + balanceDelta }
          });
        }
      } else if (creditCardId) {
        const cc = await tx.creditCard.findUnique({ where: { id: creditCardId } });
        if (cc) {
          let balanceDelta;
          if (type === 'expense') {
            balanceDelta = totalExpenseAmount;
          } else {
            balanceDelta = -finalAmount + (extraIva ? finalIvaAmount : 0);
          }
          await tx.creditCard.update({
            where: { id: creditCardId },
            data: { balance: cc.balance + balanceDelta }
          });
        }
      }

      // Mark pending as Approved
      await tx.pendingTransaction.update({
        where: { id },
        data: { status: 'APPROVED' }
      });
    });

    res.json({
      message: 'Transaction approved successfully',
      transaction: createdTx,
      ivaTransaction: createdIvaTx
    });
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
