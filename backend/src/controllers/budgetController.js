const prisma = require('../db');

/**
 * Calculates the 'Effective' budget month and year based on the budgetStartDay setting.
 * If today is >= budgetStartDay, we are in the 'next' budget month.
 */
const getEffectiveBudgetPeriod = (settings) => {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startDay = settings?.budgetStartDay || 1;

  if (startDay <= 1 || day < startDay) {
    return { month, year };
  }

  // If we've hit or passed the startDay, we are in the next budget's cycle
  let effMonth = month + 1;
  let effYear = year;
  if (effMonth > 12) {
    effMonth = 1;
    effYear++;
  }
  return { month: effMonth, year: effYear };
};

exports.getBudgets = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const settings = await prisma.setting.findUnique({
      where: { familyId: req.user.familyId }
    });
    
    // Determine the period to fetch
    const isCurrentMonth = !month && !year;
    let currentMonth, currentYear;

    if (isCurrentMonth) {
      const effective = getEffectiveBudgetPeriod(settings);
      currentMonth = effective.month;
      currentYear = effective.year;
    } else {
      currentMonth = parseInt(month);
      currentYear = parseInt(year);
    }

    let budgets = await prisma.budget.findMany({
      where: { familyId: req.user.familyId, month: currentMonth, year: currentYear },
      include: { category: true }
    });

    // ── Budget Rollover ───────────────────────────────────────────────────────
    // If we're viewing the "live" current period and there are no budgets yet,
    // auto-clone from the most recent month that has any budgets.
    if (isCurrentMonth && budgets.length === 0) {
      let lookbackMonth = currentMonth;
      let lookbackYear = currentYear;
      let prevBudgets = [];

      // Look back up to 6 months to find a template
      for (let i = 0; i < 6; i++) {
        lookbackMonth--;
        if (lookbackMonth === 0) {
          lookbackMonth = 12;
          lookbackYear--;
        }
        
        prevBudgets = await prisma.budget.findMany({
          where: { familyId: req.user.familyId, month: lookbackMonth, year: lookbackYear }
        });
        
        if (prevBudgets.length > 0) break;
      }

      if (prevBudgets.length > 0) {
        try {
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
            // skipDuplicates is not supported by SQLite connector
          });
        } catch (rolloverError) {
          console.error('Failed to auto-rollover budgets:', rolloverError);
          // We continue anyway so the user can at least see the "No budgets" screen 
          // or partial results if some were created.
        }

        // Re-fetch so we include the category relation
        budgets = await prisma.budget.findMany({
          where: { familyId: req.user.familyId, month: currentMonth, year: currentYear },
          include: { category: true }
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Calculate spent for each budget using the appropriate cycle dates
    const budgetStartDay = settings?.budgetStartDay || 1;
    let startDate, endDate;

    if (budgetStartDay === 1) {
      // Standard calendar month
      startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      endDate = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
    } else {
      // Cycle: e.g. Mar 25 to Apr 24 for 'April' budget
      // Note: month - 2 to get previous month for the start of the current cycle
      startDate = new Date(Date.UTC(currentYear, currentMonth - 2, budgetStartDay));
      endDate = new Date(Date.UTC(currentYear, currentMonth - 1, budgetStartDay - 1, 23, 59, 59, 999));
    }

    // 1. Fetch all transactions for the period to calculate spent amounts accurately by currency
    const allTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        type: { in: ['expense', 'income'] },
        OR: [
          { account: { familyId: req.user.familyId } },
          { creditCard: { familyId: req.user.familyId } }
        ]
      },
      include: {
        account: { select: { currency: true } },
        creditCard: { select: { currency: true } },
        category: true
      }
    });

    // 2. Map spending by category and currency (expenses increase spent, income offsets/reduces spent)
    const spendingMap = {}; // key: categoryId-currency
    allTransactions.forEach(tx => {
      const currency = tx.account?.currency || tx.creditCard?.currency || 'USD';
      const key = `${tx.categoryId}-${currency}`;
      if (!spendingMap[key]) {
        spendingMap[key] = { spent: 0, category: tx.category, currency };
      }
      if (tx.type === 'income') {
        spendingMap[key].spent -= tx.amount;
      } else {
        spendingMap[key].spent += tx.amount;
      }
    });

    // 3. Match with existing budgets and calculate spent
    const budgetsWithSpent = budgets.map(budget => {
      const key = `${budget.categoryId}-${budget.currency}`;
      const spentInfo = spendingMap[key];
      
      // If we match, remove from map so we can identify unbudgeted ones later
      if (spentInfo) {
        delete spendingMap[key];
      }
      
      return {
        ...budget,
        spent: spentInfo ? spentInfo.spent : 0
      };
    });

    // 4. Add virtual budgets for remaining unbudgeted spending
    // We only add them if the spent amount is non-zero
    Object.values(spendingMap).forEach(info => {
      if (Math.abs(info.spent) > 0.001) {
        budgetsWithSpent.push({
          id: `virtual-${info.category.id}-${info.currency}`,
          familyId: req.user.familyId,
          categoryId: info.category.id,
          category: info.category,
          amount: 0,
          spent: info.spent,
          currency: info.currency,
          month: currentMonth,
          year: currentYear,
          isVirtual: true
        });
      }
    });

    res.json(budgetsWithSpent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const { categoryId, amount, month, year, currency, payDay } = req.body;
    
    let targetMonth = month;
    let targetYear = year;

    if (!targetMonth || !targetYear) {
      const settings = await prisma.setting.findUnique({
        where: { familyId: req.user.familyId }
      });
      const effective = getEffectiveBudgetPeriod(settings);
      targetMonth = targetMonth || effective.month;
      targetYear = targetYear || effective.year;
    } else {
      targetMonth = parseInt(targetMonth);
      targetYear = parseInt(targetYear);
    }

    const budget = await prisma.budget.upsert({
      where: {
        familyId_categoryId_month_year: {
          familyId: req.user.familyId,
          categoryId,
          month: targetMonth,
          year: targetYear
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
        month: targetMonth,
        year: targetYear,
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

exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, amount, currency, payDay } = req.body;
    
    const budget = await prisma.budget.update({
      where: { id, familyId: req.user.familyId },
      data: {
        categoryId,
        amount: parseFloat(amount),
        currency,
        payDay: payDay ? parseInt(payDay) : null
      },
      include: { category: true }
    });

    res.json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update budget' });
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
