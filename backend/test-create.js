const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const USER_ID = 'default-user-id';
    try {
        const loan = await prisma.loan.create({
            data: {
                userId: USER_ID,
                name: "Test",
                originalBalance: 1000,
                balance: 1000,
                interestRate: 5,
                termMonths: 12,
                monthlyPayment: 85.6,
                startDate: new Date(),
                nextDueDate: new Date(),
                isVariableRate: false,
                earlyPaymentStrategy: "reduce_term",
                aprHistory: "[]",
                currency: "USD"
            }
        });
        console.log('Success:', loan);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
