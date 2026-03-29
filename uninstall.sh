#!/bin/bash
set -e

# Configuration
APP_NAME="personal-finance-app"
ENV_FILE="backend/.env"

echo "═══════════════════════════════════════════════════"
echo "  🗑️  Budget Master — Uninstall Script"
echo "═══════════════════════════════════════════════════"
echo ""

read -p "⚠️  Are you sure you want to uninstall and delete the database? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# 1. Stop and Delete PM2 Process
if command -v pm2 &> /dev/null; then
  echo "🛑 Stopping PM2 process '$APP_NAME'..."
  pm2 delete "$APP_NAME" 2>/dev/null || echo "   ⚠️  Could not find active PM2 process '$APP_NAME'."
else
  echo "   ℹ️  PM2 not found, skipping PM2 process cleanup."
fi

echo "🛑 Terminating all related node processes..."
# Kill any node processes running in the current directory or child directories
pkill -f "node.*$APP_NAME" || echo "   ℹ️  No matching node processes found."
pkill -f "prisma" || echo "   ℹ️  No matching Prisma processes found."

# 2. Identify and Delete Database
echo ""
echo "🗄️  Cleaning up database..."
if [ -f "$ENV_FILE" ]; then
  # Extract DATABASE_URL, remove quotes and "file:" prefix
  # handle both ' and " quotes
  DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  DB_FILE=$(echo "$DB_URL" | sed 's/^file://')
  
  # Prisma resolves relative paths in .env relative to the prisma/ directory
  if [[ "$DB_FILE" == ./* ]]; then
    # e.g. ./dev.db -> backend/prisma/dev.db
    ACTUAL_DB_PATH="backend/prisma/${DB_FILE#./}"
  elif [[ "$DB_FILE" != /* ]]; then
    # e.g. dev.db -> backend/prisma/dev.db
    ACTUAL_DB_PATH="backend/prisma/$DB_FILE"
  else
    # absolute path
    ACTUAL_DB_PATH="$DB_FILE"
  fi

  if [ -f "$ACTUAL_DB_PATH" ]; then
    echo "   🗑️  Deleting database and sidecar files: $ACTUAL_DB_PATH*"
    rm -f "$ACTUAL_DB_PATH" "$ACTUAL_DB_PATH-journal" "$ACTUAL_DB_PATH-wal" "$ACTUAL_DB_PATH-shm"
    echo "   ✅ Database files deleted."
  else
    echo "   ⚠️  Database file not found at $ACTUAL_DB_PATH"
  fi
else
  echo "   ⚠️  No $ENV_FILE found to identify database. Skipping DB cleanup."
fi

# 3. Remove Node Modules and Build Artifacts
echo ""
echo "📦 Removing dependencies and build artifacts..."
rm -rf node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules
rm -rf frontend/dist
rm -rf logs

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Uninstall Complete!"
echo "  Application code and .env files were PRESERVED."
echo "  Run ./install.sh to reinstall."
echo "═══════════════════════════════════════════════════"
echo ""
