const prisma = require('../db');

// Hardcoded userId for now since we removed auth

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { familyId: req.user.familyId },
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
      where: { id, familyId: req.user.familyId }
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
    
    const account = await prisma.account.create({
      data: {
        familyId: req.user.familyId,
        name,
        type,
        currency: currency || 'USD',
        balance: parseFloat(balance) || 0,
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
      where: { id, familyId: req.user.familyId },
      data: { 
        name, 
        type, 
        balance: parseFloat(balance), 
        institution, 
        currency 
      }
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
      where: { id, familyId: req.user.familyId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
