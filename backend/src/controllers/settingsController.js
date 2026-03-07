const prisma = require('../db');

const USER_ID = 'default-user-id';

exports.getSettings = async (req, res) => {
  try {
    let settings = await prisma.setting.findUnique({
      where: { userId: USER_ID }
    });

    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          userId: USER_ID,
          defaultCurrency: 'USD',
          language: 'en-US',
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
    const { defaultCurrency, language, theme } = req.body;
    const settings = await prisma.setting.update({
      where: { userId: USER_ID },
      data: { defaultCurrency, language, theme }
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
