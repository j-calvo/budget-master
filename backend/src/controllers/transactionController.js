const prisma = require('../db');

const USER_ID = 'default-user-id';

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: USER_ID }
      },
      include: {
        category: true,
        account: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        account: true
      }
    });

    if (!transaction || transaction.account.userId !== USER_ID) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { accountId, categoryId, amount, date, description, payee, type } = req.body;
    
    // Verify account belongs to user
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== USER_ID) {
      return res.status(403).json({ error: 'Unauthorized or account not found' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId,
        categoryId,
        amount,
        date: date ? new Date(date) : undefined,
        description,
        payee,
        type
      },
      include: { category: true }
    });
    
    // Update account balance
    const balanceChange = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceChange } }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, description, payee, categoryId, type } = req.body;
    
    // Fetch old to reverse balance impact
    const oldTx = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!oldTx || oldTx.account.userId !== USER_ID) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Revert old balance
    const oldBalanceChange = oldTx.type === 'expense' ? Math.abs(oldTx.amount) : -Math.abs(oldTx.amount);
    await prisma.account.update({
      where: { id: oldTx.accountId },
      data: { balance: { increment: oldBalanceChange } }
    });

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount,
        date: date ? new Date(date) : undefined,
        description,
        payee,
        categoryId,
        type
      },
      include: { category: true }
    });

    // Apply new balance
    const newBalanceChange = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    await prisma.account.update({
      where: { id: oldTx.accountId },
      data: { balance: { increment: newBalanceChange } }
    });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!transaction || transaction.account.userId !== USER_ID) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await prisma.transaction.delete({ where: { id } });

    // Revert balance
    const revertChange = transaction.type === 'expense' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);
    await prisma.account.update({
      where: { id: transaction.accountId },
      data: { balance: { increment: revertChange } }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};
