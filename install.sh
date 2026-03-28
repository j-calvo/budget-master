#!/bin/bash
echo "🚀 Starting Personal Finance App Installation..."

# 1. Check for Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js could not be found."
    read -p "Do you want to install Node v18 using NVM now? [y/N]: " install_node
    if [[ "$install_node" =~ ^[Yy]$ ]]; then
        echo "Installing NVM..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        
        # Load NVM into current shell session
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

        echo "Installing Node v18..."
        nvm install 18
        nvm use 18
    else
        echo "Please install Node manually and run the script again."
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
echo "⚙️ Setting up environment variables..."
if [ ! -f backend/.env ]; then
    echo "Creating backend/.env from example..."
    cp backend/.env.example backend/.env
else
    echo "backend/.env already exists, skipping."
fi

# 4. Install Dependencies
echo "📦 Installing backend dependencies..."
cd backend || exit
npm install

echo "📦 Installing frontend dependencies..."
cd ../frontend || exit
npm install

# 5. Setup Database
echo "🗄️ Setting up the database..."
cd ../backend || exit
npx prisma generate
npx prisma db push

# 6. Build Frontend
echo "🏗️ Building the frontend production bundle..."
cd ../frontend || exit
npm run build

# 7. Start Application
echo "▶️ Starting the application with PM2..."
cd ..
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Installation Complete! The application is now running."
echo "You can view it at: http://localhost:5001"
