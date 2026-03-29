#!/bin/bash
set -e

# Configuration
BACKUP_DIR="backend/backups"
APP_NAME="personal-finance-app"
ENV_FILE="backend/.env"

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

# 1. Identify Database and Create a pre-update backup
echo "🛡️  Creating pre-update database backup..."
if [ -f "$ENV_FILE" ]; then
  # Extract DATABASE_URL, remove quotes and "file:" prefix
  DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  DB_FILE=$(echo "$DB_URL" | sed 's/^file://')
  
  # Standardized path resolution (relative to backend/)
  if [[ "$DB_FILE" == /* ]]; then
    ACTUAL_DB_PATH="$DB_FILE"
  else
    CLEAN_DB_FILE=$(echo "$DB_FILE" | sed 's/^\.\///')
    ACTUAL_DB_PATH="backend/$CLEAN_DB_FILE"
  fi

  if [ -f "$ACTUAL_DB_PATH" ]; then
    mkdir -p "$BACKUP_DIR"
    DB_NAME=$(basename "$ACTUAL_DB_PATH")
    BACKUP_NAME="pre-update-${DB_NAME}-$(date +%Y%m%d-%H%M%S).db"
    cp "$ACTUAL_DB_PATH" "$BACKUP_DIR/$BACKUP_NAME"
    echo "   ✅ Backup saved: $BACKUP_DIR/$BACKUP_NAME"
  else
    echo "   ⚠️  No database found at $ACTUAL_DB_PATH, skipping backup."
  fi
else
  echo "   ⚠️  No $ENV_FILE found to identify database. Skipping backup."
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
echo "═══════════════════════════════════════════════════"
echo ""
