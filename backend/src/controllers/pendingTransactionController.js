const prisma = require('../db');

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
    const { accountId, categoryId, creditCardId, type, description } = req.body;
    const familyId = req.user.familyId;

    const pending = await prisma.pendingTransaction.findUnique({ where: { id } });
    if (!pending || pending.familyId !== familyId) {
      return res.status(404).json({ error: 'Pending transaction not found' });
    }

    if (pending.status !== 'PENDING') {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    // Wrap in transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Create actual transaction
      const newTransaction = await tx.transaction.create({
        data: {
          accountId: accountId || null,
          creditCardId: creditCardId || null,
          categoryId,
          amount: pending.amount,
          date: pending.date,
          description: description || pending.merchantDescription,
          type: type || 'expense'
        }
      });

      // Update balances
      if (accountId) {
        const account = await tx.account.findUnique({ where: { id: accountId } });
        if (account) {
          const newBalance = type === 'expense' || type === 'transfer'
            ? account.balance - pending.amount
            : account.balance + pending.amount;
          await tx.account.update({
            where: { id: accountId },
            data: { balance: newBalance }
          });
        }
      } else if (creditCardId) {
        const cc = await tx.creditCard.findUnique({ where: { id: creditCardId } });
        if (cc) {
          const newBalance = type === 'expense'
            ? cc.balance + pending.amount
            : cc.balance - pending.amount;
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

    res.json({ message: 'Transaction approved successfully' });
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
