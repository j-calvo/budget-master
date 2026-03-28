const prisma = require('../db');
const fs = require('fs');
const csv = require('csv-parser');
const { parse: parseCsv } = require('json2csv');


exports.getTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { account: { familyId: req.user.familyId } },
          { creditCard: { familyId: req.user.familyId } }
        ]
      },
      include: {
        category: true,
        account: true,
        creditCard: true
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
        account: true,
        creditCard: true
      }
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    const familyId = transaction.accountId ? transaction.account?.familyId : transaction.creditCard?.familyId;
    
    if (familyId !== req.user.familyId) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { accountId, creditCardId, categoryId, amount, date, description, payee, type } = req.body;
    
    // Verify account or credit card belongs to user
    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account || account.familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized or account not found' });
    } else if (creditCardId) {
      const card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
      if (!card || card.familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized or credit card not found' });
    } else {
      return res.status(400).json({ error: 'Must provide accountId or creditCardId' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId,
        creditCardId,
        categoryId,
        amount,
        date: date ? new Date(date) : undefined,
        description,
        payee,
        type
      },
      include: { category: true }
    });
    
    // Update balance
    if (accountId) {
      const balanceChange = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
      await prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceChange } }
      });
    } else if (creditCardId) {
      // CC expense increases balance
      const balanceChange = type === 'expense' ? Math.abs(amount) : -Math.abs(amount);
      await prisma.creditCard.update({
        where: { id: creditCardId },
        data: { balance: { increment: balanceChange } }
      });
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, description, payee, categoryId, type, accountId, creditCardId } = req.body;
    
    // Fetch old to reverse balance impact
    const oldTx = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true, creditCard: true }
    });

    if (!oldTx) return res.status(404).json({ error: 'Transaction not found' });
    const familyId = oldTx.accountId ? oldTx.account?.familyId : oldTx.creditCard?.familyId;
    if (familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized' });

    // Verify new source
    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account || account.familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized account' });
    } else if (creditCardId) {
      const card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
      if (!card || card.familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized credit card' });
    }

    // Revert old balance
    if (oldTx.accountId) {
      const oldBalanceChange = oldTx.type === 'expense' ? Math.abs(oldTx.amount) : -Math.abs(oldTx.amount);
      await prisma.account.update({
        where: { id: oldTx.accountId },
        data: { balance: { increment: oldBalanceChange } }
      });
    } else if (oldTx.creditCardId) {
      const oldBalanceChange = oldTx.type === 'expense' ? -Math.abs(oldTx.amount) : Math.abs(oldTx.amount);
      await prisma.creditCard.update({
        where: { id: oldTx.creditCardId },
        data: { balance: { increment: oldBalanceChange } }
      });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        amount,
        date: date ? new Date(date) : undefined,
        description,
        payee,
        categoryId,
        type,
        accountId: accountId || null,
        creditCardId: creditCardId || null
      },
      include: { category: true }
    });

    // Apply new balance
    if (accountId) {
      const newBalanceChange = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
      await prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: newBalanceChange } }
      });
    } else if (creditCardId) {
      const newBalanceChange = type === 'expense' ? Math.abs(amount) : -Math.abs(amount);
      await prisma.creditCard.update({
        where: { id: creditCardId },
        data: { balance: { increment: newBalanceChange } }
      });
    }

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
      include: { account: true, creditCard: true }
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    const familyId = transaction.accountId ? transaction.account?.familyId : transaction.creditCard?.familyId;
    if (familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized' });

    await prisma.transaction.delete({ where: { id } });

    // Revert balance
    if (transaction.accountId) {
      const revertChange = transaction.type === 'expense' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);
      await prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: revertChange } }
      });
    } else if (transaction.creditCardId) {
      const revertChange = transaction.type === 'expense' ? -Math.abs(transaction.amount) : Math.abs(transaction.amount);
      await prisma.creditCard.update({
        where: { id: transaction.creditCardId },
        data: { balance: { increment: revertChange } }
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

exports.exportTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { 
        OR: [
          { account: { familyId: req.user.familyId } },
          { creditCard: { familyId: req.user.familyId } }
        ]
      },
      include: { category: true, account: true, creditCard: true },
      orderBy: { date: 'desc' }
    });

    const formattedData = transactions.map(tx => ({
      ID: tx.id,
      Date: new Date(tx.date).toISOString().split('T')[0],
      Description: tx.description,
      Amount: tx.amount,
      Type: tx.type,
      Account: tx.account ? tx.account.name : (tx.creditCard ? tx.creditCard.name : ''),
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
        const accounts = await prisma.account.findMany({ where: { familyId: req.user.familyId } });
        const categories = await prisma.category.findMany({ where: { familyId: req.user.familyId } });

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
