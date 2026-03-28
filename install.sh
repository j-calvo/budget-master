#!/bin/bash
echo "🚀 Starting Personal Finance App Installation..."

# 1. Check for Node.js and its version
NODE_NEEDS_INSTALL=false

if ! command -v node &> /dev/null; then
    echo "❌ Node.js could not be found."
    NODE_NEEDS_INSTALL=true
else
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo "❌ Node.js version is v$NODE_VERSION, but at least v20 is required."
        NODE_NEEDS_INSTALL=true
    else
        echo "✅ Node.js version $(node -v) found."
    fi
fi

if [ "$NODE_NEEDS_INSTALL" = true ]; then
    read -p "Do you want to install Node v22 using NVM now? [y/N]: " install_node
    if [[ "$install_node" =~ ^[Yy]$ ]]; then
        echo "Installing NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        
        # Load NVM into current shell session
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        echo "Installing Node v22..."
        nvm install 22
        nvm use 22
    else
        echo "Please install Node 20+ manually and run the script again."
        exit 1
    fi
fi

# 2. Check for PM2
if ! command -v pm2 &> /dev/null
then
    echo "❌ PM2 could not be found."
    read -p "Do you want to install PM2 globally now? [y/N]: " install_pm2
    if [[ "$install_pm2" =~ ^[Yy]$ ]]; then
        echo "Installing PM2 globally..."
        npm install -g pm2
    else
        echo "Please install PM2 manually and run the script again."
        exit 1
    fi
fi

# 3. Setup Environment Variables
echo "⚙️  Setting up environment variables..."
if [ ! -f backend/.env ]; then
    if [ -f backend/.env.example ]; then
        echo "   Creating backend/.env from example..."
        cp backend/.env.example backend/.env
    else
        echo "   ⚠️  No backend/.env.example found. Creating a generic .env..."
        echo "DATABASE_URL=\"file:./dev.db\"" > backend/.env
        echo "PORT=5001" >> backend/.env
        echo "NODE_ENV=production" >> backend/.env
    fi
else
    echo "   ✅ backend/.env already exists."
fi

# 4. Install Dependencies
echo ""
echo "📦 Installing backend dependencies..."
(cd backend && npm install)

echo ""
echo "📦 Installing frontend dependencies..."
(cd frontend && npm install)

# 5. Setup Database
echo ""
echo "🗄️  Setting up the database..."
(cd backend && npx prisma generate)

echo "   🔄 Syncing schema and seeding core data..."
(cd backend && npx prisma db push --accept-data-loss)
(cd backend && npx prisma db seed)

# 6. Build Frontend
echo ""
echo "🏗️  Building the frontend production bundle..."
(cd frontend && npm run build)

# 7. Start Application
echo ""
echo "▶️  Starting the application with PM2..."
if command -v pm2 &> /dev/null; then
  # Try to restart if named 'personal-finance-app' already, else start
  pm2 restart personal-finance-app 2>/dev/null || pm2 start ecosystem.config.cjs
  pm2 save
else
  echo "   ⚠️  PM2 not found. You may need to manually start the node process."
  echo "   Example: cd backend && npm start"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  🏢 Installation Complete!"
echo "  Deploy Status: SUCCESS"
echo "  Initial Seed: COMPLETE (Core data only)"
echo ""
echo "  Login: Navigate to http://localhost:5173/register"
echo "         to create your first Administrator account."
echo "═══════════════════════════════════════════════════"
echo ""
