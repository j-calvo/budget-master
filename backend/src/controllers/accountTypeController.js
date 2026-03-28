const prisma = require('../db');


exports.getAccountTypes = async (req, res) => {
    try {
        const accountTypes = await prisma.accountType.findMany({
            where: { familyId: req.user.familyId },
            orderBy: { name: 'asc' }
        });

        // Seed default account types if none exist
        if (accountTypes.length === 0) {

            const defaultTypes = [
                { familyId: req.user.familyId, name: 'Ahorros' },
                { familyId: req.user.familyId, name: 'Planilla' },
            ];

            try {
                await prisma.accountType.createMany({
                    data: defaultTypes
                });
            } catch (err) {
                console.warn('Default account types already seeded on conflict.');
            }

            const newTypes = await prisma.accountType.findMany({
                where: { familyId: req.user.familyId },
                orderBy: { name: 'asc' }
            });
            return res.json(newTypes);
        }

        res.json(accountTypes);
    } catch (error) {
        console.error('getAccountTypes error:', error);
        res.status(500).json({ error: 'Failed to fetch account types' });
    }
};

exports.createAccountType = async (req, res) => {
    try {
        const { name } = req.body;
        const accountType = await prisma.accountType.create({
            data: { familyId: req.user.familyId, name }
        });
        res.status(201).json(accountType);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Account type already exists' })
        res.status(500).json({ error: 'Failed to create account type' });
    }
};

exports.updateAccountType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const accountType = await prisma.accountType.update({
            where: { id, familyId: req.user.familyId },
            data: { name }
        });
        res.json(accountType);
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: 'Account type already exists' })
        res.status(500).json({ error: 'Failed to update account type' });
    }
};

exports.deleteAccountType = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.accountType.delete({
            where: { id, familyId: req.user.familyId }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete account type' });
    }
};
