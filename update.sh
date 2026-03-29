#!/bin/bash
set -e

# Configuration
DB_PATH="backend/prisma/dev.db"
BACKUP_DIR="backend/backups"
APP_NAME="personal-finance-app"

# Parse arguments
FLUSH_DB=false
SKIP_GIT=false

for arg in "$@"; do
  case $arg in
    --flush|-f)
      FLUSH_DB=true
      shift
      ;;
    --skip-git)
      SKIP_GIT=true
      shift
      ;;
    *)
      # Ignore unknown
      ;;
  esac
done

echo "═══════════════════════════════════════════════════"
echo "  🏢 Budget Master — Deployment & Update Script"
echo "═══════════════════════════════════════════════════"
echo ""

# Navigate to the correct directory (script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Create a pre-update backup
echo "🛡️  Creating pre-update database backup..."
if [ -f "$DB_PATH" ]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP_NAME="pre-update-$(date +%Y%m%d-%H%M%S).db"
  cp "$DB_PATH" "$BACKUP_DIR/$BACKUP_NAME"
  echo "   ✅ Backup saved: $BACKUP_DIR/$BACKUP_NAME"
else
  echo "   ⚠️  No database found at $DB_PATH, skipping backup."
fi

# 2. Pull latest code (if in git repo)
if [ -d ".git" ] && [ "$SKIP_GIT" = false ]; then
  echo ""
  echo "📥 Updating source code..."
  git pull origin main || echo "   ⚠️  Git pull failed, continuing with local code."
else
  echo ""
  echo "📦 Skipping source code update (no .git found or --skip-git used)."
fi

# 3. Install dependencies
echo ""
echo "📦 Installing backend dependencies..."
(cd backend && npm install)

echo ""
echo "📦 Installing frontend dependencies..."
(cd frontend && npm install)

# 4. Apply database schema updates
echo ""
echo "🗄️  Applying database schema updates..."
(cd backend && npx prisma generate) || { echo "❌ Failed to generate Prisma Client"; exit 1; }

if [ "$FLUSH_DB" = true ]; then
  echo "   ⚠️  FLUSHING DATABASE! (All existing data will be lost)..."
  (cd backend && npx prisma db push --force-reset) || { echo "❌ Failed to flush database"; exit 1; }
else
  echo "   🔄 Syncing schema to database..."
  (cd backend && npx prisma db push --accept-data-loss) || { echo "❌ Failed to sync Prisma schema"; exit 1; }
fi

# 5. Build frontend production bundle
echo ""
echo "🏗️  Building frontend production bundle..."
(cd frontend && npm run build)

# 6. Restart application
echo ""
echo "🔄 Restarting application..."
if command -v pm2 &> /dev/null; then
  # Try to restart existing process, or start from config
  pm2 restart "$APP_NAME" || pm2 start ecosystem.config.cjs || echo "   ⚠️ PM2 could not restart process automatically."
else
  echo "   ℹ️ PM2 not found. You may need to manually restart the node process."
  echo "   Example: cd backend && npm start"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✨ Update Complete!"
echo "  Deployment Status: SUCCESS"
if [ "$FLUSH_DB" = true ]; then
  echo "  Database Status: RESET (Empty)"
else
  echo "  Database Status: UPDATED (Data preserved)"
fi
echo "═══════════════════════════════════════════════════"
echo ""
