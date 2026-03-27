const prisma = require('../db');
const fs = require('fs');
const csv = require('csv-parser');
const { parse: parseCsv } = require('json2csv');

const USER_ID = 'default-user-id';

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: USER_ID }
      },
      include: {
        category: true,
        account: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        account: true
      }
    });

    if (!transaction || transaction.account.userId !== USER_ID) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { accountId, categoryId, amount, date, description, payee, type } = req.body;
    
    // Verify account belongs to user
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== USER_ID) {
      return res.status(403).json({ error: 'Unauthorized or account not found' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId,
        categoryId,
        amount,
        date: date ? new Date(date) : undefined,
        description,
        payee,
        type
      },
      include: { category: true }
    });
    
    // Update account balance
    const balanceChange = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceChange } }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, description, payee, categoryId, type } = req.body;
    
    // Fetch old to reverse balance impact
    const oldTx = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!oldTx || oldTx.account.userId !== USER_ID) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Revert old balance
    const oldBalanceChange = oldTx.type === 'expense' ? Math.abs(oldTx.amount) : -Math.abs(oldTx.amount);
    await prisma.account.update({
      where: { id: oldTx.accountId },
      data: { balance: { increment: oldBalanceChange } }
    });

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount,
        date: date ? new Date(date) : undefined,
        description,
        payee,
        categoryId,
        type
      },
      include: { category: true }
    });

    // Apply new balance
    const newBalanceChange = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    await prisma.account.update({
      where: { id: oldTx.accountId },
      data: { balance: { increment: newBalanceChange } }
    });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!transaction || transaction.account.userId !== USER_ID) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await prisma.transaction.delete({ where: { id } });

    // Revert balance
    const revertChange = transaction.type === 'expense' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);
    await prisma.account.update({
      where: { id: transaction.accountId },
      data: { balance: { increment: revertChange } }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

exports.exportTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { account: { userId: USER_ID } },
      include: { category: true, account: true },
      orderBy: { date: 'desc' }
    });

    const formattedData = transactions.map(tx => ({
      ID: tx.id,
      Date: new Date(tx.date).toISOString().split('T')[0],
      Description: tx.description,
      Amount: tx.amount,
      Type: tx.type,
      Account: tx.account?.name || '',
      Category: tx.category?.name || 'Uncategorized',
      Payee: tx.payee || ''
    }));

    if (formattedData.length === 0) {
      return res.status(404).json({ error: 'No transactions found to export.' });
    }

    const csvOutput = parseCsv(formattedData);
    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    return res.send(csvOutput);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
};

exports.importTransactions = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const results = [];
  try {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let importedCount = 0;
        
        // Fetch valid accounts/categories to map IDs
        const accounts = await prisma.account.findMany({ where: { userId: USER_ID } });
        const categories = await prisma.category.findMany({ where: { userId: USER_ID } });

        // Basic default fallbacks
        const defaultAccount = accounts[0];
        if (!defaultAccount) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: 'You need at least one account to import transactions.' });
        }

        for (const row of results) {
          // Flexible mapping for various CSV headers (Date, Amount, Description, etc.)
          const dateStr = row.Date || row.date || row.DATE;
          const descStr = row.Description || row.description || row.Name || row.name || 'Imported Transaction';
          const amtStr = row.Amount || row.amount || row.Value;
          
          if (!amtStr) continue;
          
          let amount = parseFloat(amtStr.replace(/[^0-9.-]+/g,""));
          if (isNaN(amount)) continue;

          // Determine type (if undefined, guess based on sign)
          let type = row.Type || row.type;
          if (!type) {
            type = amount >= 0 ? 'income' : 'expense';
          } else {
            type = type.toLowerCase();
            if (type !== 'income' && type !== 'expense') type = 'expense';
          }
          amount = Math.abs(amount);

          // Find specific Account by name (if provided)
          const accName = row.Account || row.account;
          const matchedAcc = accounts.find(a => a.name.toLowerCase() === accName?.toLowerCase()) || defaultAccount;

          // Find specific Category by name
          const catName = row.Category || row.category;
          let matchedCatId = null;
          if (catName) {
            const matchedCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
            if (matchedCat) matchedCatId = matchedCat.id;
          }

          const parsedDate = dateStr ? new Date(dateStr) : new Date();

          await prisma.transaction.create({
            data: {
              accountId: matchedAcc.id,
              categoryId: matchedCatId,
              amount,
              type,
              date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
              description: descStr,
              payee: row.Payee || row.payee || ''
            }
          });

          // Update Account Balance
          const balanceChange = type === 'expense' ? -amount : amount;
          await prisma.account.update({
            where: { id: matchedAcc.id },
            data: { balance: { increment: balanceChange } }
          });

          importedCount++;
        }

        // Cleanup temp file
        fs.unlinkSync(req.file.path);
        
        res.json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} transactions.` });
      });
  } catch (error) {
    console.error('Import error:', error);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to process CSV file.' });
  }
};
