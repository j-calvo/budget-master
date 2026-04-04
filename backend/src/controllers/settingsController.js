const prisma = require('../db');


exports.getSettings = async (req, res) => {
  try {
    const familyId = req.user.familyId;

    // Verify the family actually exists before attempting upsert
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      return res.status(404).json({ error: 'Family not found. Please log in again.' });
    }

    const settings = await prisma.setting.upsert({
      where: { familyId },
      update: {},  // no-op if already exists
      create: {
        familyId,
        defaultCurrency: 'USD',
        language: 'en-US',
        fontFamily: 'Outfit',
        payFrequency: 'monthly',
        payDay: 15,
        payDay2: null,
        payDayOfWeek: null,
        budgetStartDay: 1,
        theme: 'light'
      }
    });

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { 
      defaultCurrency, language, theme, fontFamily, budgetStartDay, 
      payFrequency, payDay, payDay2, payDayOfWeek 
    } = req.body;
    
    const settings = await prisma.setting.update({
      where: { familyId: req.user.familyId },
      data: { 
        defaultCurrency, 
        language, 
        theme, 
        fontFamily, 
        budgetStartDay: parseInt(budgetStartDay) || 1, 
        payFrequency, 
        payDay: parseInt(payDay) || 1, 
        payDay2: payDay2 ? parseInt(payDay2) : null, 
        payDayOfWeek: (payDayOfWeek !== null && payDayOfWeek !== undefined) ? parseInt(payDayOfWeek) : null 
      }
    });
    res.json(settings);
  } catch (error) {
    console.error('updateSettings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

exports.getEmailConfig = async (req, res) => {
  try {
    const config = await prisma.emailServerConfig.findUnique({
      where: { familyId: req.user.familyId },
      select: {
        id: true, host: true, port: true, secure: true, user: true, isActive: true, syncInterval: true
        // don't send back password
      }
    });
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
};

exports.updateEmailConfig = async (req, res) => {
  try {
    const { host, port, secure, user, password, syncInterval, isActive } = req.body;
    let data = { host, port: parseInt(port), secure, user, syncInterval: parseInt(syncInterval), isActive };
    if (password) {
      data.password = password;
    }
    
    const config = await prisma.emailServerConfig.upsert({
      where: { familyId: req.user.familyId },
      update: data,
      create: {
        familyId: req.user.familyId,
        ...data,
        password: password || ''
      }
    });
    
    // Omit password from response
    delete config.password;
    
    res.json(config);
  } catch (err) {
    console.error('EmailConfig update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update email config' });
  }
};

exports.getParsingRules = async (req, res) => {
  try {
    const rules = await prisma.parsingRule.findMany({
      where: { familyId: req.user.familyId }
    });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
};

exports.addParsingRule = async (req, res) => {
  try {
    const rule = await prisma.parsingRule.create({
      data: {
        familyId: req.user.familyId,
        ...req.body
      }
    });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create rule' });
  }
};

exports.updateParsingRule = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.parsingRule.updateMany({
      where: { id, familyId: req.user.familyId },
      data: req.body
    });
    const updated = await prisma.parsingRule.findFirst({ where: { id, familyId: req.user.familyId } });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
};

exports.deleteParsingRule = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.parsingRule.deleteMany({
      where: {
        id,
        familyId: req.user.familyId
      }
    });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
};
