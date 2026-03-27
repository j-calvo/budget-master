/**
 * seed.js - Restore base configuration for the personal finance app.
 * Run with: node seed.js [--flush]
 * 
 * This will UPSERT (create or keep existing if already present) the default
 * Currencies, Banks, Categories, Account Types, and Settings for the default user.
 * It will NOT delete any existing data — it only ensures defaults exist,
 * UNLESS you pass the --flush flag, which cleans up all seed data before creating.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_ID = 'default-user-id';
const FAMILY_ID = 'default-family-id';

const { 
  seedFamilyData, 
  DEFAULT_CURRENCIES, 
  DEFAULT_BANKS, 
  DEFAULT_ACCOUNT_TYPES, 
  DEFAULT_CATEGORIES 
} = require('./src/utils/seeder');

async function main() {
  const flush = process.argv.includes('--flush');
  console.log('🌱 Starting seed...');

  if (flush) {
    console.log('🧹 Flushing ENTIRE database... (all data will be lost)');
    // Delete in order to respect foreign key constraints
    await prisma.transaction.deleteMany({});
    await prisma.loanPayment.deleteMany({});
    await prisma.loan.deleteMany({});
    await prisma.budget.deleteMany({});
    await prisma.creditCard.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.setting.deleteMany({});
    await prisma.currency.deleteMany({});
    await prisma.bank.deleteMany({});
    await prisma.accountType.deleteMany({});
    await prisma.familyMember.deleteMany({});
    await prisma.family.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('🗑️  Database completely flushed.');
  }

  // Ensure default Family exists
  await prisma.family.upsert({
    where: { inviteCode: 'DEFAULT' },
    update: { id: FAMILY_ID, name: 'Default Family' },
    create: { id: FAMILY_ID, name: 'Default Family', inviteCode: 'DEFAULT' },
  });
  console.log('✅ Default family ensured.');

  // Ensure default user exists
  await prisma.user.upsert({
    where: { email: 'admin@budgetmaster.local' },
    update: { id: USER_ID, name: 'Admin User' },
    create: { id: USER_ID, name: 'Admin User', email: 'admin@budgetmaster.local', password: null },
  });
  console.log('✅ Default user ensured.');

  // Ensure FamilyMember relation
  const existingMember = await prisma.familyMember.findFirst({
    where: { userId: USER_ID, familyId: FAMILY_ID }
  });
  if (!existingMember) {
    await prisma.familyMember.create({
      data: { userId: USER_ID, familyId: FAMILY_ID, role: 'ADMIN' }
    });
  }

  // Ensure default Setting
  await prisma.setting.upsert({
    where: { familyId: FAMILY_ID },
    update: { language: 'es-ES', defaultCurrency: 'CRC' },
    create: { familyId: FAMILY_ID, language: 'es-ES', defaultCurrency: 'CRC', theme: 'light' },
  });
  console.log('✅ Default settings ensured (es-ES, CRC).');

  // Use the common seeder logic
  await seedFamilyData(prisma, FAMILY_ID);
  
  console.log(`✅ Currencies seeded: ${DEFAULT_CURRENCIES.map(c => c.code).join(', ')}`);
  console.log(`✅ Banks seeded: ${DEFAULT_BANKS.map(b => b.name).join(', ')}`);
  console.log(`✅ Account Types seeded: ${DEFAULT_ACCOUNT_TYPES.map(t => t.name).join(', ')}`);
  console.log(`✅ Categories seeded: ${DEFAULT_CATEGORIES.length} categories`);

  console.log('🎉 Seed complete!');
}

main()
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
