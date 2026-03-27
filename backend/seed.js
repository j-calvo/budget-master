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

const DEFAULT_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

const DEFAULT_BANKS = [
  { name: 'BAC San Jose' },
  { name: 'BCR' },
  { name: 'Davivienda' },
];

const DEFAULT_ACCOUNT_TYPES = [
  { name: 'Ahorros' },
  { name: 'Planilla' },
];

const DEFAULT_CATEGORIES = [
  { name: 'Lote', type: 'fixed_expense', color: '#EF4444' },
  { name: 'Casa', type: 'fixed_expense', color: '#F97316' },
  { name: 'Casa Pago Extra', type: 'variable_expense', color: '#F59E0B' },
  { name: 'Comida', type: 'variable_expense', color: '#84CC16' },
  { name: 'Mantenimiento', type: 'variable_expense', color: '#22C55E' },
  { name: 'Internet', type: 'fixed_expense', color: '#10B981' },
  { name: 'Agua', type: 'variable_expense', color: '#14B8A6' },
  { name: 'Luz', type: 'variable_expense', color: '#06B6D4' },
  { name: 'HBO', type: 'fixed_expense', color: '#0EA5E9' },
  { name: 'Gasolina', type: 'variable_expense', color: '#3B82F6' },
  { name: 'Impuestos Casas', type: 'variable_expense', color: '#6366F1' },
  { name: 'Telefonos', type: 'fixed_expense', color: '#8B5CF6' },
  { name: 'Gollo', type: 'variable_expense', color: '#A855F7' },
  { name: 'Universidad Jose', type: 'fixed_expense', color: '#D946EF' },
  { name: 'Pension', type: 'fixed_expense', color: '#EC4899' },
  { name: 'Mesada Ana', type: 'variable_expense', color: '#F43F5E' },
  { name: 'Mesada Jose', type: 'variable_expense', color: '#fda4af' },
  { name: 'No Presupuestados', type: 'variable_expense', color: '#94a3b8' },
  { name: 'Marchamo', type: 'variable_expense', color: '#cbd5e1' },
];

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
    await prisma.user.deleteMany({});
    console.log('🗑️  Database completely flushed.');
  }

  // Ensure default user exists
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, name: 'Default User' },
  });
  console.log('✅ Default user ensured.');

  // Ensure default Setting
  await prisma.setting.upsert({
    where: { userId: USER_ID },
    update: { language: 'es-ES', defaultCurrency: 'CRC' },
    create: { userId: USER_ID, language: 'es-ES', defaultCurrency: 'CRC', theme: 'light' },
  });
  console.log('✅ Default settings ensured (es-ES, CRC).');

  // Seed Currencies
  for (const c of DEFAULT_CURRENCIES) {
    await prisma.currency.upsert({
      where: { userId_code: { userId: USER_ID, code: c.code } },
      update: { symbol: c.symbol, name: c.name },
      create: { userId: USER_ID, ...c },
    });
  }
  console.log(`✅ Currencies seeded: ${DEFAULT_CURRENCIES.map(c => c.code).join(', ')}`);

  // Seed Banks
  for (const b of DEFAULT_BANKS) {
    await prisma.bank.upsert({
      where: { userId_name: { userId: USER_ID, name: b.name } },
      update: {},
      create: { userId: USER_ID, ...b },
    });
  }
  console.log(`✅ Banks seeded: ${DEFAULT_BANKS.map(b => b.name).join(', ')}`);

  // Seed Account Types
  for (const t of DEFAULT_ACCOUNT_TYPES) {
    await prisma.accountType.upsert({
      where: { userId_name: { userId: USER_ID, name: t.name } },
      update: {},
      create: { userId: USER_ID, ...t },
    });
  }
  console.log(`✅ Account Types seeded: ${DEFAULT_ACCOUNT_TYPES.map(t => t.name).join(', ')}`);

  // Seed Categories
  for (const c of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { userId: USER_ID, name: c.name }
    });
    if (!existing) {
      await prisma.category.create({
        data: { userId: USER_ID, ...c }
      });
    }
  }
  console.log(`✅ Categories seeded: ${DEFAULT_CATEGORIES.length} categories`);

  console.log('🎉 Seed complete!');
}

main()
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
