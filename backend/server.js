const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
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
const { authenticateToken } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;

const corsOptions = process.env.NODE_ENV === 'production'
  ? { origin: false }
  : { origin: 'http://localhost:5173', credentials: true };
app.use(cors(corsOptions));
app.use(express.json());

// Public API Routes
app.use('/api/auth', authRoutes);

// Protected MVP Routes
const familyRoutes = require('./src/routes/familyRoutes');
app.use('/api/family', authenticateToken, familyRoutes);

app.use('/api/accounts', authenticateToken, accountRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/budgets', authenticateToken, budgetRoutes);
app.use('/api/currencies', authenticateToken, currencyRoutes);
app.use('/api/credit-cards', authenticateToken, creditCardRoutes);
app.use('/api/loans', authenticateToken, loanRoutes);
app.use('/api/banks', authenticateToken, bankRoutes);
app.use('/api/account-types', authenticateToken, accountTypeRoutes);

const backupRoutes = require('./src/routes/backupRoutes');
app.use('/api/backups', authenticateToken, backupRoutes);

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
