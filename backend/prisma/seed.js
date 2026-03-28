const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  // Clean DB safely (in proper order to avoid cascading issues if missing cascade deletes)
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.loanPayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.creditCard.deleteMany();
  await prisma.account.deleteMany();
  await prisma.category.deleteMany();
  await prisma.bank.deleteMany();
  await prisma.accountType.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.family.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding new data...');

  // 1. Create User
  const password = await bcrypt.hash("123456", 10);
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@test.com",
      password: password
    }
  });

  // 2. Create Family
  const family = await prisma.family.create({
    data: {
      name: "Test Family",
      inviteCode: "TESTBETA",
      settings: {
        create: {
          language: "en-US",
          defaultCurrency: "USD",
          theme: "light",
          fontFamily: "Outfit",
          payFrequency: "monthly",
          payDay: 15
        }
      }
    }
  });

  await prisma.familyMember.create({
    data: {
      userId: user.id,
      familyId: family.id,
      role: "ADMIN"
    }
  });

  // 3. Create Currencies
  const usd = await prisma.currency.create({ data: { familyId: family.id, code: "USD", symbol: "$", name: "US Dollar" } });
  const crc = await prisma.currency.create({ data: { familyId: family.id, code: "CRC", symbol: "₡", name: "Costa Rican Colón" } });
  const eur = await prisma.currency.create({ data: { familyId: family.id, code: "EUR", symbol: "€", name: "Euro" } });

  // 4. Create Banks & Types
  const bank = await prisma.bank.create({ data: { familyId: family.id, name: "Global Bank" } });
  const bank2 = await prisma.bank.create({ data: { familyId: family.id, name: "National Bank" } });
  await prisma.accountType.create({ data: { familyId: family.id, name: "Checking" } });
  await prisma.accountType.create({ data: { familyId: family.id, name: "Savings" } });

  // 5. Create Accounts
  const mainChecking = await prisma.account.create({
    data: { familyId: family.id, name: "Main Checking", type: "Checking", currency: "USD", balance: 5000, institution: "Global Bank" }
  });
  const savingsCRC = await prisma.account.create({
    data: { familyId: family.id, name: "Emergency Savings", type: "Savings", currency: "CRC", balance: 1500000, institution: "National Bank" }
  });
  const europeTrip = await prisma.account.create({
    data: { familyId: family.id, name: "Europe Trip Fund", type: "Savings", currency: "EUR", balance: 1200, institution: "Global Bank" }
  });

  // 6. Create Credit Cards
  const ccGold = await prisma.creditCard.create({
    data: { familyId: family.id, name: "Gold Rewards Card", limit: 10000, balance: 1250, dueDate: 20, apr: 18.5, currency: "USD", statementDay: 1 }
  });
  const ccLocal = await prisma.creditCard.create({
    data: { familyId: family.id, name: "Local Shopping Card", limit: 2000000, balance: 450000, dueDate: 15, apr: 22.0, currency: "CRC", statementDay: 25 }
  });

  // 7. Create Loans
  const carLoan = await prisma.loan.create({
    data: { 
      familyId: family.id, name: "Car Loan", originalBalance: 25000, balance: 18500, interestRate: 6.5, termMonths: 60,
      monthlyPayment: 489.15, insuranceCost: 45.0, startDate: new Date("2024-01-01"), nextDueDate: new Date("2026-04-01"),
      currency: "USD"
    }
  });

  // 8. Create Categories
  const catIncome = await prisma.category.create({ data: { familyId: family.id, name: "Salary", type: "income", color: "#10b981" } });
  const catGroceries = await prisma.category.create({ data: { familyId: family.id, name: "Groceries", type: "variable_expense", color: "#3b82f6" } });
  const catDining = await prisma.category.create({ data: { familyId: family.id, name: "Dining Out", type: "variable_expense", color: "#f59e0b" } });
  const catUtilities = await prisma.category.create({ data: { familyId: family.id, name: "Utilities", type: "fixed_expense", color: "#8b5cf6" } });
  const catOutOfBudget = await prisma.category.create({ data: { familyId: family.id, name: "Out of budget", type: "variable_expense", color: "#64748b" } });

  // 9. Create Budgets
  const d = new Date();
  const currentMonth = d.getMonth() + 1;
  const currentYear = d.getFullYear();

  await prisma.budget.create({
    data: { familyId: family.id, categoryId: catGroceries.id, amount: 800, currency: "USD", month: currentMonth, year: currentYear }
  });
  await prisma.budget.create({
    data: { familyId: family.id, categoryId: catDining.id, amount: 150000, currency: "CRC", month: currentMonth, year: currentYear }
  });
  await prisma.budget.create({
    data: { familyId: family.id, categoryId: catUtilities.id, amount: 250, currency: "USD", month: currentMonth, year: currentYear }
  });

  // 10. Create Transactions
  const createTx = async (accountId, creditCardId, categoryId, amount, type, description, txDate) => {
    return prisma.transaction.create({
      data: {
        accountId, creditCardId, categoryId, amount, type, description, date: txDate
      }
    });
  };

  // Salary
  await createTx(mainChecking.id, null, catIncome.id, 6250, 'income', 'Monthly Salary', new Date());

  // Expenses from account
  await createTx(mainChecking.id, null, catUtilities.id, 120, 'expense', 'Electric Bill', new Date());
  await createTx(savingsCRC.id, null, catGroceries.id, 25000, 'expense', 'Fresh Market', new Date());
  
  // Expenses from credit cards
  await createTx(null, ccGold.id, catDining.id, 85, 'expense', 'Steakhouse Dinner', new Date());
  await createTx(null, ccLocal.id, catGroceries.id, 45000, 'expense', 'Local Supermarket', new Date());

  // Out of budget
  await createTx(mainChecking.id, null, catOutOfBudget.id, 150, 'expense', 'Unexpected Repair', new Date());
  
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
