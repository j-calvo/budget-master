const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { PrismaClient } = require('./generated/prisma');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

/**
 * Standardized Database Client (Prisma 7 singleton)
 */

// 1. Get the connection string from environment
const rawUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

// 2. Resolve the absolute path to the .db file
// We resolve relative to the backend/ root (up one level from src/)
const dbRelativePath = rawUrl.replace('file:', '').replace(/^\.\//, '');
const absoluteDbPath = path.resolve(__dirname, '..', dbRelativePath);

const connectionUrl = `file:${absoluteDbPath}`;
console.log('🔗 [Prisma 7] Connecting to database via:', connectionUrl);

// 3. Initialize driver adapter and client
const adapter = new PrismaBetterSqlite3({ 
  url: connectionUrl 
});

/**
 * IMPORTANT: This PrismaClient instance is a singleton.
 * If the physical .db file is replaced (e.g., during a backup restore), 
 * this handle must be disconnected and the process restarted to re-sync.
 */
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
