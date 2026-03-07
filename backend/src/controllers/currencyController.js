const prisma = require('../db');

const USER_ID = 'default-user-id';

exports.getCurrencies = async (req, res) => {
  try {
    const currencies = await prisma.currency.findMany({
      where: { userId: USER_ID },
      orderBy: { code: 'asc' }
    });
    
    // Seed default currencies if none exist
    if (currencies.length === 0) {
      // Ensure default user exists
      let user = await prisma.user.findUnique({ where: { id: USER_ID } });
      if (!user) {
        user = await prisma.user.create({
          data: { id: USER_ID, name: 'Default User' }
        });
      }

      const defaultCurrencies = [
        { userId: USER_ID, code: 'USD', symbol: '$', name: 'US Dollar' },
        { userId: USER_ID, code: 'EUR', symbol: '€', name: 'Euro' },
        { userId: USER_ID, code: 'GBP', symbol: '£', name: 'British Pound' },
        { userId: USER_ID, code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
        { userId: USER_ID, code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
        { userId: USER_ID, code: 'AUD', symbol: '$', name: 'Australian Dollar' }
      ];
      
      // SQLite does not support skipDuplicates, use isolated createMany or catch on duplicate keys
      try {
        await prisma.currency.createMany({
          data: defaultCurrencies
        });
      } catch (err) {
        console.warn('Default currencies already seeded on conflict.');
      }
      
      const newCurrencies = await prisma.currency.findMany({
        where: { userId: USER_ID },
        orderBy: { code: 'asc' }
      });
      return res.json(newCurrencies);
    }
    
    res.json(currencies);
  } catch (error) {
    console.error('getCurrencies error:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
};

exports.createCurrency = async (req, res) => {
  try {
    const { code, symbol, name } = req.body;
    const currency = await prisma.currency.create({
      data: { userId: USER_ID, code, symbol, name }
    });
    res.status(201).json(currency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create currency' });
  }
};

exports.updateCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, symbol, name } = req.body;
    const currency = await prisma.currency.update({
      where: { id, userId: USER_ID },
      data: { code, symbol, name }
    });
    res.json(currency);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update currency' });
  }
};

exports.deleteCurrency = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.currency.delete({
      where: { id, userId: USER_ID }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete currency' });
  }
};
