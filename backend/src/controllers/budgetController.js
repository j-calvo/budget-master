const prisma = require('../db');

exports.getBudgets = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { familyId: req.user.familyId, month: currentMonth, year: currentYear },
      include: { category: true }
    });

    // Calculate spent for each budget
    const settings = await prisma.setting.findUnique({
      where: { familyId: req.user.familyId }
    });
    const budgetStartDay = settings?.budgetStartDay || 1;

    let startDate, endDate;
    if (budgetStartDay === 1) {
      startDate = new Date(currentYear, currentMonth - 1, 1);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    } else {
      // If startDay is 18, and we want "March 2026" budget: 
      // It starts on Feb 18 and ends on Mar 17.
      startDate = new Date(currentYear, currentMonth - 2, budgetStartDay);
      endDate = new Date(currentYear, currentMonth - 1, budgetStartDay - 1, 23, 59, 59, 999);
      // Wait, let's verify: March (3) -> currentMonth-2 is 1 (Feb). Feb 18.
      // currentMonth-1 is 2 (Mar). Mar 17. Correct.
    }

    const budgetsWithSpent = await Promise.all(budgets.map(async (budget) => {
      const transactions = await prisma.transaction.aggregate({
        where: {
          categoryId: budget.categoryId,
          type: 'expense',
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        }
      });
      return {
        ...budget,
        spent: transactions._sum.amount || 0
      };
    }));

    res.json(budgetsWithSpent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { categoryId, amount, month, year, currency, payDay } = req.body;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const budget = await prisma.budget.upsert({
      where: {
        familyId_categoryId_month_year: {
          familyId: req.user.familyId,
          categoryId,
          month: currentMonth,
          year: currentYear
        }
      },
      update: { 
        amount: parseFloat(amount),
        currency: currency || 'CRC',
        payDay: payDay ? parseInt(payDay) : null
      },
      create: {
        familyId: req.user.familyId,
        categoryId,
        amount: parseFloat(amount),
        month: currentMonth,
        year: currentYear,
        currency: currency || 'CRC',
        payDay: payDay ? parseInt(payDay) : null
      },
      include: { category: true }
    });

    res.json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.budget.delete({
      where: { id, familyId: req.user.familyId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
};
