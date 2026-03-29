const path = require('path');
require('dotenv').config();
const { PrismaClient } = require('./generated/prisma');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

// Resolve absolute path to the database file (Prisma 7 recommends absolute paths for SQLite adapters)
const dbUrlFromEnv = process.env.DATABASE_URL || 'file:./dev.db';
const db_filename = dbUrlFromEnv.replace('file:', '');
const absolutePath = path.resolve(__dirname, '../prisma', db_filename.replace(/^\.\//, ''));

const connectionUrl = `file:${absolutePath}`;
console.log('🔗 [Prisma 7] Connecting to database via:', connectionUrl);

// Note: PrismaBetterSqlite3 from @prisma/adapter-better-sqlite3 
// expects a connection config object { url: string }
const adapter = new PrismaBetterSqlite3({ 
  url: connectionUrl 
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
