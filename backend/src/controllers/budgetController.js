const prisma = require('../db');
const USER_ID = 'default-user-id';

exports.getBudgets = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const budgets = await prisma.budget.findMany({
      where: { userId: USER_ID, month: currentMonth, year: currentYear },
      include: { category: true }
    });

    // Calculate spent for each budget
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

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
    const { categoryId, amount, month, year } = req.body;
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: USER_ID,
          categoryId,
          month: currentMonth,
          year: currentYear
        }
      },
      update: { amount: parseFloat(amount) },
      create: {
        userId: USER_ID,
        categoryId,
        amount: parseFloat(amount),
        month: currentMonth,
        year: currentYear
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
      where: { id, userId: USER_ID }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
};
