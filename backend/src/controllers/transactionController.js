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
    const {
      accountId,
      creditCardId,
      categoryId,
      amount,
      date,
      description,
      payee,
      type,
      originalAmount,
      originalCurrency,
      exchangeRate,
      settlementStatus,
      settledAt,
      extraIva,
      ivaRate = 13,
      ivaAmount,
      ivaCategoryId,
      ivaDescription
    } = req.body;
    
    // Verify account or credit card belongs to user
    let account = null;
    let card = null;
    
    if (accountId) {
      account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account || account.familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized or account not found' });
    }
    
    if (creditCardId) {
      card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
      if (!card || card.familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized or credit card not found' });
    }
    
    if (!accountId && !creditCardId) {
      return res.status(400).json({ error: 'Must provide accountId or creditCardId' });
    }

    const parsedAmount = parseFloat(amount);
    const ratePercent = parseFloat(ivaRate) > 0 ? parseFloat(ivaRate) : 13;
    const rateFactor = ratePercent / 100;

    let finalIvaAmount = 0;
    let finalIvaOriginalAmount = null;

    if (extraIva) {
      if (ivaAmount && !isNaN(parseFloat(ivaAmount)) && parseFloat(ivaAmount) > 0) {
        finalIvaAmount = parseFloat(ivaAmount);
      } else {
        finalIvaAmount = parseFloat((parsedAmount * rateFactor).toFixed(2));
      }
      if (originalAmount !== undefined && originalAmount !== null && !isNaN(parseFloat(originalAmount))) {
        finalIvaOriginalAmount = parseFloat((parseFloat(originalAmount) * rateFactor).toFixed(2));
      }
    }

    let transaction;
    let ivaTransaction = null;

    await prisma.$transaction(async (tx) => {
      transaction = await tx.transaction.create({
        data: {
          accountId,
          creditCardId,
          categoryId,
          amount: parsedAmount,
          originalAmount: originalAmount !== undefined && originalAmount !== null ? parseFloat(originalAmount) : null,
          originalCurrency: originalCurrency || null,
          exchangeRate: exchangeRate !== undefined && exchangeRate !== null ? parseFloat(exchangeRate) : null,
          settlementStatus: settlementStatus || 'SETTLED',
          settledAt: settledAt ? new Date(settledAt) : (settlementStatus === 'SETTLED' ? new Date() : null),
          date: date ? new Date(date) : undefined,
          description,
          payee,
          type
        },
        include: { category: true }
      });

      if (extraIva && finalIvaAmount > 0) {
        const defaultIvaDesc = `IVA (${ratePercent}%) - ${description}`;
        ivaTransaction = await tx.transaction.create({
          data: {
            accountId,
            creditCardId,
            categoryId: ivaCategoryId || categoryId,
            amount: finalIvaAmount,
            originalAmount: finalIvaOriginalAmount,
            originalCurrency: originalCurrency || null,
            exchangeRate: exchangeRate !== undefined && exchangeRate !== null ? parseFloat(exchangeRate) : null,
            settlementStatus: settlementStatus || 'SETTLED',
            settledAt: settledAt ? new Date(settledAt) : (settlementStatus === 'SETTLED' ? new Date() : null),
            date: date ? new Date(date) : undefined,
            description: ivaDescription || defaultIvaDesc,
            payee,
            type: 'expense'
          },
          include: { category: true }
        });
      }

      // Update balance
      if (type === 'transfer' && accountId && creditCardId) {
        // Direct transfer (Credit Card Payment)
        await tx.account.update({
          where: { id: accountId },
          data: { balance: { decrement: parsedAmount } }
        });
        await tx.creditCard.update({
          where: { id: creditCardId },
          data: { balance: { decrement: parsedAmount } }
        });
      } else {
        const totalExpenseAmount = parsedAmount + (extraIva ? finalIvaAmount : 0);

        if (accountId) {
          let balanceChange;
          if (type === 'expense') {
            balanceChange = -totalExpenseAmount;
          } else {
            balanceChange = Math.abs(parsedAmount) - (extraIva ? finalIvaAmount : 0);
          }
          await tx.account.update({
            where: { id: accountId },
            data: { balance: { increment: balanceChange } }
          });
        } else if (creditCardId) {
          let balanceChange;
          if (type === 'expense') {
            balanceChange = totalExpenseAmount;
          } else {
            balanceChange = -Math.abs(parsedAmount) + (extraIva ? finalIvaAmount : 0);
          }
          await tx.creditCard.update({
            where: { id: creditCardId },
            data: { balance: { increment: balanceChange } }
          });
        }
      }
    });

    res.status(201).json({ ...transaction, ivaTransaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      date,
      description,
      payee,
      categoryId,
      type,
      accountId,
      creditCardId,
      originalAmount,
      originalCurrency,
      exchangeRate,
      settlementStatus,
      settledAt
    } = req.body;
    
    // Fetch old to reverse balance impact
    const oldTx = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true, creditCard: true }
    });

    if (!oldTx) return res.status(404).json({ error: 'Transaction not found' });
    const familyId = oldTx.accountId ? oldTx.account?.familyId : oldTx.creditCard?.familyId;
    if (familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized' });

    // Verify new source
    let account = null;
    let card = null;

    if (accountId) {
      account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account || account.familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized account' });
    }
    
    if (creditCardId) {
      card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
      if (!card || card.familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized credit card' });
    }

    if (!accountId && !creditCardId) {
      return res.status(400).json({ error: 'Must provide accountId or creditCardId' });
    }

    // Revert old balance
    if (oldTx.type === 'transfer' && oldTx.accountId && oldTx.creditCardId) {
       await prisma.account.update({
         where: { id: oldTx.accountId },
         data: { balance: { increment: Math.abs(oldTx.amount) } }
       });
       await prisma.creditCard.update({
         where: { id: oldTx.creditCardId },
         data: { balance: { increment: Math.abs(oldTx.amount) } }
       });
    } else {
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
    }

    const parsedAmount = parseFloat(amount);
    const updateData = {
      amount: parsedAmount,
      date: date ? new Date(date) : undefined,
      description,
      payee,
      categoryId,
      type,
      accountId: accountId || null,
      creditCardId: creditCardId || null
    };

    if (originalAmount !== undefined) {
      updateData.originalAmount = originalAmount !== null ? parseFloat(originalAmount) : null;
    }
    if (originalCurrency !== undefined) {
      updateData.originalCurrency = originalCurrency || null;
    }
    if (exchangeRate !== undefined) {
      updateData.exchangeRate = exchangeRate !== null ? parseFloat(exchangeRate) : null;
    }
    if (settlementStatus !== undefined) {
      updateData.settlementStatus = settlementStatus;
    }
    if (settledAt !== undefined) {
      updateData.settledAt = settledAt ? new Date(settledAt) : null;
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { category: true }
    });

    // Apply new balance
    if (type === 'transfer' && accountId && creditCardId) {
      await prisma.account.update({
        where: { id: accountId },
        data: { balance: { decrement: parsedAmount } }
      });
      await prisma.creditCard.update({
        where: { id: creditCardId },
        data: { balance: { decrement: parsedAmount } }
      });
    } else {
      if (accountId) {
        const newBalanceChange = type === 'expense' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
        await prisma.account.update({
          where: { id: accountId },
          data: { balance: { increment: newBalanceChange } }
        });
      } else if (creditCardId) {
        const newBalanceChange = type === 'expense' ? Math.abs(parsedAmount) : -Math.abs(parsedAmount);
        await prisma.creditCard.update({
          where: { id: creditCardId },
          data: { balance: { increment: newBalanceChange } }
        });
      }
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
    if (transaction.type === 'transfer' && transaction.accountId && transaction.creditCardId) {
      await prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: Math.abs(transaction.amount) } }
      });
      await prisma.creditCard.update({
        where: { id: transaction.creditCardId },
        data: { balance: { increment: Math.abs(transaction.amount) } }
      });
    } else {
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

exports.settleTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { settledAmount, settledDate } = req.body;

    if (settledAmount === undefined || settledAmount === null || isNaN(parseFloat(settledAmount)) || parseFloat(settledAmount) <= 0) {
      return res.status(400).json({ error: 'Valid settledAmount is required' });
    }

    const newAmount = parseFloat(settledAmount);

    const oldTx = await prisma.transaction.findUnique({
      where: { id },
      include: { account: true, creditCard: true, category: true }
    });

    if (!oldTx) return res.status(404).json({ error: 'Transaction not found' });
    const familyId = oldTx.accountId ? oldTx.account?.familyId : oldTx.creditCard?.familyId;
    if (familyId !== req.user.familyId) return res.status(403).json({ error: 'Unauthorized' });

    // Delta between new settled amount and previously recorded amount
    const delta = newAmount - oldTx.amount;
    const originalAmt = oldTx.originalAmount || oldTx.amount;
    const effectiveRate = originalAmt > 0 ? (newAmount / originalAmt) : null;

    let updatedTx;
    await prisma.$transaction(async (tx) => {
      // 1. Update the transaction
      updatedTx = await tx.transaction.update({
        where: { id },
        data: {
          amount: newAmount,
          exchangeRate: effectiveRate ? parseFloat(effectiveRate.toFixed(6)) : null,
          settlementStatus: 'SETTLED',
          settledAt: settledDate ? new Date(settledDate) : new Date()
        },
        include: { category: true, account: true, creditCard: true }
      });

      // 2. Adjust balance by delta
      if (Math.abs(delta) > 0.000001) {
        if (oldTx.creditCardId) {
          // For credit card expense: positive delta means card balance increases
          const balanceChange = oldTx.type === 'expense' ? delta : -delta;
          await tx.creditCard.update({
            where: { id: oldTx.creditCardId },
            data: { balance: { increment: balanceChange } }
          });
        } else if (oldTx.accountId) {
          // For bank account expense: positive delta means bank balance decreases
          const balanceChange = oldTx.type === 'expense' ? -delta : delta;
          await tx.account.update({
            where: { id: oldTx.accountId },
            data: { balance: { increment: balanceChange } }
          });
        }
      }
    });

    res.json({ message: 'Transaction settled successfully', transaction: updatedTx });
  } catch (error) {
    console.error('settleTransaction error:', error);
    res.status(500).json({ error: 'Failed to settle transaction' });
  }
};
