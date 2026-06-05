const prisma = require('../db');

// GET /api/ev-charging
exports.getEvLogs = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const records = await prisma.evChargingLog.findMany({
      where: { familyId },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (error) {
    console.error('getEvLogs error:', error);
    res.status(500).json({ error: 'Failed to fetch EV charging logs' });
  }
};

// POST /api/ev-charging
exports.createEvLog = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const { date, billingPeriod, kwh, note } = req.body;

    if (!date || !billingPeriod || kwh === undefined) {
      return res.status(400).json({ error: 'Missing required fields: date, billingPeriod, kwh' });
    }

    const record = await prisma.evChargingLog.create({
      data: {
        familyId,
        date: new Date(date),
        billingPeriod,
        kwh: parseFloat(kwh),
        note: note || null,
      }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('createEvLog error:', error);
    res.status(500).json({ error: 'Failed to save EV charging log' });
  }
};

// PUT /api/ev-charging/:id
exports.updateEvLog = async (req, res) => {
  try {
    const { id } = req.params;
    const familyId = req.user.familyId;

    const existing = await prisma.evChargingLog.findFirst({
      where: { id, familyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Record not found or unauthorized' });
    }

    const { date, billingPeriod, kwh, note } = req.body;

    const record = await prisma.evChargingLog.update({
      where: { id },
      data: {
        date: date !== undefined ? new Date(date) : existing.date,
        billingPeriod: billingPeriod !== undefined ? billingPeriod : existing.billingPeriod,
        kwh: kwh !== undefined ? parseFloat(kwh) : existing.kwh,
        note: note !== undefined ? note : existing.note,
      }
    });

    res.json(record);
  } catch (error) {
    console.error('updateEvLog error:', error);
    res.status(500).json({ error: 'Failed to update EV charging log' });
  }
};

// DELETE /api/ev-charging/:id
exports.deleteEvLog = async (req, res) => {
  try {
    const { id } = req.params;
    const familyId = req.user.familyId;

    const existing = await prisma.evChargingLog.findFirst({
      where: { id, familyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Record not found or unauthorized' });
    }

    await prisma.evChargingLog.delete({ where: { id } });

    res.json({ success: true, message: 'EV charging log deleted successfully' });
  } catch (error) {
    console.error('deleteEvLog error:', error);
    res.status(500).json({ error: 'Failed to delete EV charging log' });
  }
};
