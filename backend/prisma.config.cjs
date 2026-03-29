// backend/prisma.config.cjs
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { defineConfig, env } = require('prisma/config');

/**
 * Prisma 7 Configuration (CommonJS)
 */

// 1. Get the connection string from environment
const rawUrl = env('DATABASE_URL') || 'file:./prisma/dev.db';

// 2. Resolve the absolute path to the .db file
// Since this file is in the backend/ root, we resolve relative to __dirname
const dbRelativePath = rawUrl.replace('file:', '').replace(/^\.\//, '');
const absoluteDbPath = path.resolve(__dirname, dbRelativePath);

const connectionUrl = `file:${absoluteDbPath}`;
console.log('🔗 [Prisma 7 Config] Using absolute path:', connectionUrl);

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Ensuring the CLI and the App both use the exact same absolute path
    url: connectionUrl,
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
});
