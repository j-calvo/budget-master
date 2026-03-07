const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const USER_ID = 'default-user-id';
  
  // Ensure user exists
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, name: 'Default User' }
  });

  const categories = [
    { name: 'Salary', type: 'income', color: '#10b981' },
    { name: 'Groceries', type: 'variable_expense', color: '#3b82f6' },
    { name: 'Dining Out', type: 'variable_expense', color: '#f59e0b' },
    { name: 'Rent', type: 'fixed_expense', color: '#ef4444' },
    { name: 'Entertainment', type: 'variable_expense', color: '#8b5cf6' },
    { name: 'Utilities', type: 'fixed_expense', color: '#06b6d4' }
  ];

  for (const cat of categories) {
    await prisma.category.create({
      data: {
        userId: USER_ID,
        ...cat
      }
    });
  }

  console.log('Database seeded with categories!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
