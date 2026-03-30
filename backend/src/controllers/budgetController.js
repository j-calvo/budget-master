const prisma = require('../db');

exports.getBudgets = async (req, res) => {
  try {
    const { month, year } = req.query;
    const isCurrentMonth = !month && !year; // only auto-rollover for the "live" view
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    let budgets = await prisma.budget.findMany({
      where: { familyId: req.user.familyId, month: currentMonth, year: currentYear },
      include: { category: true }
    });

    // ── Budget Rollover ───────────────────────────────────────────────────────
    // If we're viewing the current month and there are no budgets yet,
    // auto-clone the previous month's definitions (amounts, currency, payDay).
    // `spent` is always re-calculated live, so it starts clean at 0.
    if (isCurrentMonth && budgets.length === 0) {
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear  = currentMonth === 1 ? currentYear - 1 : currentYear;

      const prevBudgets = await prisma.budget.findMany({
        where: { familyId: req.user.familyId, month: prevMonth, year: prevYear }
      });

      if (prevBudgets.length > 0) {
        await prisma.budget.createMany({
          data: prevBudgets.map(b => ({
            familyId: req.user.familyId,
            categoryId: b.categoryId,
            amount:     b.amount,
            currency:   b.currency,
            payDay:     b.payDay,
            month:      currentMonth,
            year:       currentYear,
          })),
          skipDuplicates: true, // safety net if somehow rows exist
        });

        // Re-fetch so we include the category relation
        budgets = await prisma.budget.findMany({
          where: { familyId: req.user.familyId, month: currentMonth, year: currentYear },
          include: { category: true }
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

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
      startDate = new Date(currentYear, currentMonth - 2, budgetStartDay);
      endDate = new Date(currentYear, currentMonth - 1, budgetStartDay - 1, 23, 59, 59, 999);
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
