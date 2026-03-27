require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const accountRoutes = require('./src/routes/accountRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const currencyRoutes = require('./src/routes/currencyRoutes');
const creditCardRoutes = require('./src/routes/creditCardRoutes');
const loanRoutes = require('./src/routes/loanRoutes');
const bankRoutes = require('./src/routes/bankRoutes');
const accountTypeRoutes = require('./src/routes/accountTypeRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: false }
  : { origin: 'http://localhost:5173', credentials: true };
app.use(cors(corsOptions));
app.use(express.json());

// Main MVP Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/credit-cards', creditCardRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/account-types', accountTypeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const distPath = path.resolve(__dirname, '../frontend/dist');
  const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
  app.use(express.static(distPath));

  // Catch-all route for SPA routing — must be after API routes
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      return next();
    }
    res.type('html').send(indexHtml);
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
