const prisma = require('../db');

// Hardcoded userId for now since we removed auth
const USER_ID = 'default-user-id';

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

exports.getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await prisma.account.findUnique({
      where: { id, userId: USER_ID }
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch account' });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const { name, type, balance, institution, currency } = req.body;
    
    // Ensure default user exists
    let user = await prisma.user.findUnique({ where: { id: USER_ID } });
    if (!user) {
      user = await prisma.user.create({
        data: { id: USER_ID, name: 'Default User' }
      });
    }

    const account = await prisma.account.create({
      data: {
        userId: USER_ID,
        name,
        type,
        currency: currency || 'USD',
        balance: balance || 0,
        institution
      }
    });
    res.status(201).json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, balance, institution, currency } = req.body;
    const account = await prisma.account.update({
      where: { id, userId: USER_ID },
      data: { name, type, balance, institution, currency }
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.account.delete({
      where: { id, userId: USER_ID }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
