#!/bin/bash
echo "Updating Personal Finance App..."

git pull origin main

echo "Installing backend dependencies..."
cd backend || exit
npm install

echo "Applying database updates..."
npx prisma db push

echo "Installing and building frontend..."
cd ../frontend || exit
npm install
npm run build

echo "Restarting application..."
pm2 restart personal-finance-app

echo "Update Complete!"
