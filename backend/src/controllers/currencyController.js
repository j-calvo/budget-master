const prisma = require('../db');
const currencyService = require('../services/currencyService');


exports.getCurrencies = async (req, res) => {
  try {
    const currencies = await prisma.currency.findMany({
      where: { familyId: req.user.familyId },
      orderBy: { code: 'asc' }
    });

    // Seed default currencies if none exist
    if (currencies.length === 0) {

      const defaultCurrencies = [
        { familyId: req.user.familyId, code: 'USD', symbol: '$', name: 'US Dollar' },
        { familyId: req.user.familyId, code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
        { familyId: req.user.familyId, code: 'EUR', symbol: '€', name: 'Euro' },
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
        where: { familyId: req.user.familyId },
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
      data: { familyId: req.user.familyId, code, symbol, name }
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
      where: { id, familyId: req.user.familyId },
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
      where: { id, familyId: req.user.familyId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete currency' });
  }
};

exports.getRates = async (req, res) => {
  try {
    const settings = await prisma.setting.findUnique({
      where: { familyId: req.user.familyId }
    });
    const base = settings?.defaultCurrency || 'USD';
    const rates = await currencyService.getExchangeRates(base);
    res.json({ base, rates });
  } catch (error) {
    console.error('getRates error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
};
