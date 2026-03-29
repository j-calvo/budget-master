const prisma = require('../src/db');
const { 
  DEFAULT_CURRENCIES, 
  DEFAULT_BANKS, 
  DEFAULT_ACCOUNT_TYPES, 
  DEFAULT_CATEGORIES 
} = require('../src/utils/seeder');

async function main() {
  console.log('🧹 Clearing existing data...');
  // Clean DB safely
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
  await prisma.exchangeRate.deleteMany();

  console.log('🌱 Seeding Blueprint Data...');

  // 1. Create a "System Blueprint" Family
  // In this design, core data belongs to a family.
  // This family will be the landing spot for the first administrator.
  const family = await prisma.family.create({
    data: {
      name: "System Blueprint",
      inviteCode: "INIT-ACCOUNT",
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

  console.log('   ✅ Default Family created (Invite: INIT-ACCOUNT)');

  // 2. Seed Blueprint Data (Using upsert/create)
  
  // Currencies
  for (const c of DEFAULT_CURRENCIES) {
    await prisma.currency.create({ data: { familyId: family.id, ...c } });
  }
  console.log(`   ✅ ${DEFAULT_CURRENCIES.length} Currencies seeded.`);

  // Banks
  for (const b of DEFAULT_BANKS) {
    await prisma.bank.create({ data: { familyId: family.id, ...b } });
  }
  console.log(`   ✅ ${DEFAULT_BANKS.length} Banks seeded.`);

  // Account Types
  for (const t of DEFAULT_ACCOUNT_TYPES) {
    await prisma.accountType.create({ data: { familyId: family.id, ...t } });
  }
  console.log(`   ✅ ${DEFAULT_ACCOUNT_TYPES.length} Account Types seeded.`);

  // Categories
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.create({ data: { familyId: family.id, ...c } });
  }
  console.log(`   ✅ ${DEFAULT_CATEGORIES.length} Categories seeded.`);

  // 3. System Data
  await prisma.exchangeRate.create({
    data: {
      base: 'USD',
      rates: JSON.stringify({ CRC: 515, EUR: 0.92, GBP: 0.79 })
    }
  });
  console.log('   ✅ Exchange rates initialized.');

  console.log('\n✨ Seeding completed successfully!');
  console.log('Database is now ready for the first user to register.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
