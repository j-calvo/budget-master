const prisma = require('../db');
 // simplified auth

// Get all credit cards
exports.getCreditCards = async (req, res) => {
  try {
    const cards = await prisma.creditCard.findMany({
      where: { familyId: req.user.familyId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(cards);
  } catch (error) {
    console.error('getCreditCards error:', error);
    res.status(500).json({ error: 'Failed to fetch credit cards' });
  }
};

// Create a new credit card
exports.createCreditCard = async (req, res) => {
  try {
    const { name, limit, balance, dueDate, statementDay, apr, currency, last4Digits } = req.body;
    
    if (!name || !limit) {
      return res.status(400).json({ error: 'Name and limit are required' });
    }

    const card = await prisma.creditCard.create({
      data: {
        familyId: req.user.familyId,
        name,
        limit: parseFloat(limit),
        balance: parseFloat(balance) || 0,
        dueDate: parseInt(dueDate) || 1,
        statementDay: parseInt(statementDay) || 1,
        apr: parseFloat(apr) || 0,
        currency: currency || 'USD',
        last4Digits: last4Digits ? String(last4Digits).slice(-4) : null,
      },
    });
    
    res.status(201).json(card);
  } catch (error) {
    console.error('createCreditCard error:', error);
    res.status(500).json({ error: 'Failed to create credit card' });
  }
};

// Update an existing credit card
exports.updateCreditCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, limit, balance, dueDate, statementDay, apr, currency, last4Digits } = req.body;
    
    const card = await prisma.creditCard.update({
      where: { id, familyId: req.user.familyId },
      data: {
        name,
        limit: parseFloat(limit),
        balance: parseFloat(balance),
        dueDate: parseInt(dueDate),
        statementDay: parseInt(statementDay),
        apr: parseFloat(apr),
        currency,
        last4Digits: last4Digits ? String(last4Digits).slice(-4) : null,
      },
    });
    
    res.json(card);
  } catch (error) {
    console.error('updateCreditCard error:', error);
    res.status(500).json({ error: 'Failed to update credit card' });
  }
};

// Delete a credit card
exports.deleteCreditCard = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.creditCard.delete({
      where: { id, familyId: req.user.familyId },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('deleteCreditCard error:', error);
    res.status(500).json({ error: 'Failed to delete credit card' });
  }
};
