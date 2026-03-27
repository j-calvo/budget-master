const prisma = require('../db');


exports.getSettings = async (req, res) => {
  try {
    let settings = await prisma.setting.findUnique({
      where: { familyId: req.user.familyId }
    });

    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          familyId: req.user.familyId,
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
    }

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
        defaultCurrency, language, theme, fontFamily, budgetStartDay, 
        payFrequency, payDay, payDay2, payDayOfWeek 
      }
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
