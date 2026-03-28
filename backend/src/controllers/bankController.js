const prisma = require('../db');


exports.getBanks = async (req, res) => {
    try {
        const banks = await prisma.bank.findMany({
            where: { familyId: req.user.familyId },
            orderBy: { name: 'asc' }
        });

        // Seed default banks if none exist
        if (banks.length === 0) {
            let user = await prisma.user.findUnique({ where: { id: USER_ID } });
            if (!user) {
                user = await prisma.user.create({
                    data: { id: USER_ID, name: 'Default User' }
                });
            }

            const defaultBanks = [
                { familyId: req.user.familyId, name: 'BAC San Jose' },
                { familyId: req.user.familyId, name: 'Davivienda' },
                { familyId: req.user.familyId, name: 'BCR' },
            ];
            try {
                await prisma.bank.createMany({
                    data: defaultBanks
                });
            } catch (err) {
                console.warn('Default banks already seeded on conflict.');
            }

            const newBanks = await prisma.bank.findMany({
                where: { familyId: req.user.familyId },
                orderBy: { name: 'asc' }
            });
            return res.json(newBanks);
        }

        res.json(banks);
    } catch (error) {
        console.error('getBanks error:', error);
        res.status(500).json({ error: 'Failed to fetch banks' });
    }
};

exports.createBank = async (req, res) => {
    try {
        const { name } = req.body;
        const bank = await prisma.bank.create({
            data: { familyId: req.user.familyId, name }
        });
        res.status(201).json(bank);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Bank name already exists' })
        res.status(500).json({ error: 'Failed to create bank' });
    }
};

exports.updateBank = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const bank = await prisma.bank.update({
            where: { id, familyId: req.user.familyId },
            data: { name }
        });
        res.json(bank);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Bank name already exists' })
        res.status(500).json({ error: 'Failed to update bank' });
    }
};

exports.deleteBank = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.bank.delete({
            where: { id, familyId: req.user.familyId }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete bank' });
    }
};
