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
    const { name, type, balance, institution, currency, isLiquid, last4Digits } = req.body;
    
    const account = await prisma.account.create({
      data: {
        familyId: req.user.familyId,
        name,
        type,
        currency: currency || 'USD',
        last4Digits: last4Digits ? String(last4Digits).slice(-4) : null,
        balance: parseFloat(balance) || 0,
        isLiquid: isLiquid !== undefined ? Boolean(isLiquid) : true,
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
    const { name, type, balance, institution, currency, isLiquid, last4Digits } = req.body;
    const account = await prisma.account.update({
      where: { id, familyId: req.user.familyId },
      data: { 
        name, 
        type, 
        balance: parseFloat(balance) || 0, 
        institution, 
        currency,
        last4Digits: last4Digits ? String(last4Digits).slice(-4) : null,
        isLiquid: isLiquid !== undefined ? Boolean(isLiquid) : true 
      }
    });
    res.json(account);
  } catch (error) {
    console.error('updateAccount error:', error);
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

// ── Balance Adjustments ───────────────────────────────────────────────────

exports.adjustBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type = 'contribution', note = '', date } = req.body;

    let delta = parseFloat(amount);
    if (isNaN(delta) || delta === 0) {
      return res.status(400).json({ error: 'amount must be a non-zero number' });
    }

    // Force negative for withdrawals
    if (type === 'withdrawal') {
      delta = -Math.abs(delta);
    }

    const account = await prisma.account.findUnique({
      where: { id, familyId: req.user.familyId }
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    // Atomic: log the entry + increment the balance
    const [adjustment, updatedAccount] = await prisma.$transaction([
      prisma.accountAdjustment.create({
        data: {
          accountId: id,
          familyId:  req.user.familyId,
          amount:    delta,
          type,
          note:      note || '',
          date:      date ? new Date(date) : new Date(),
        }
      }),
      prisma.account.update({
        where: { id },
        data:  { balance: { increment: delta } }
      })
    ]);

    res.json({ adjustment, account: updatedAccount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record adjustment' });
  }
};

exports.getAdjustments = async (req, res) => {
  try {
    const { id } = req.params;
    const adjustments = await prisma.accountAdjustment.findMany({
      where: { accountId: id, familyId: req.user.familyId },
      orderBy: { date: 'desc' },
      take: 50
    });
    res.json(adjustments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch adjustments' });
  }
};

