require('dotenv').config();
const express = require('express');
const cors = require('cors');

const accountRoutes = require('./src/routes/accountRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const currencyRoutes = require('./src/routes/currencyRoutes');
const creditCardRoutes = require('./src/routes/creditCardRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Main MVP Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/credit-cards', creditCardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
