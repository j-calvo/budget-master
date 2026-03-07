require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('DB URL:', process.env.DATABASE_URL); // debug logging

const prisma = new PrismaClient();
module.exports = prisma;
