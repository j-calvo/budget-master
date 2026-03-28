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

/**
 * Seeds a family with default data (Currencies, Banks, Account Types, Categories).
 * Uses a transaction client if provided, otherwise uses the global prisma client.
 */
async function seedFamilyData(prisma, familyId) {
  // 1. Currencies
  for (const c of DEFAULT_CURRENCIES) {
    await prisma.currency.upsert({
      where: { familyId_code: { familyId, code: c.code } },
      update: { symbol: c.symbol, name: c.name },
      create: { familyId, ...c },
    });
  }

  // 2. Banks
  for (const b of DEFAULT_BANKS) {
    await prisma.bank.upsert({
      where: { familyId_name: { familyId, name: b.name } },
      update: {},
      create: { familyId, ...b },
    });
  }

  // 3. Account Types
  for (const t of DEFAULT_ACCOUNT_TYPES) {
    await prisma.accountType.upsert({
      where: { familyId_name: { familyId, name: t.name } },
      update: {},
      create: { familyId, ...t },
    });
  }

  // 4. Categories
  for (const c of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { familyId, name: c.name }
    });
    if (!existing) {
      await prisma.category.create({
        data: { familyId, ...c }
      });
    }
  }
}

module.exports = {
  seedFamilyData,
  DEFAULT_CURRENCIES,
  DEFAULT_BANKS,
  DEFAULT_ACCOUNT_TYPES,
  DEFAULT_CATEGORIES
};
