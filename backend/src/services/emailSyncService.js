const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;
const cron = require('node-cron');
const prisma = require('../db');

async function processEmailsForConfig(config) {
  if (!config.isActive) return;

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password
    },
    logger: false 
  });

  try {
    console.log(`Connecting to IMAP ${config.host} for ${config.user}...`);
    await client.connect();
    console.log(`Connected to IMAP for ${config.user}`);
    
    // Lock INBOX
    console.log(`Getting Mailbox Lock on INBOX...`);
    let lock = await client.getMailboxLock('INBOX');
    console.log(`Mailbox INBOX locked.`);
    try {
      // Get all parsing rules for this family
      const rules = await prisma.parsingRule.findMany({
        where: { familyId: config.familyId, isActive: true }
      });

      if (rules.length === 0) return; // No rules, nothing to do
      
      const senders = [...new Set(rules.map(r => r.senderEmail))];
      console.log(`Found ${senders.length} unique senders to check.`);

      for (const sender of senders) {
        console.log(`Fetching unseen messages from ${sender}...`);
        const messages = client.fetch({ unseen: true, from: sender }, { uid: true, source: true });
        
        let counter = 0;
        const uidsToMark = [];

        for await (let msg of messages) {
          counter++;
          console.log(`Processing message UID: ${msg.uid}...`);
          uidsToMark.push(msg.uid);
          const parsed = await simpleParser(msg.source);
          let body = parsed.text || parsed.html || '';

          // Completely strip HTML tags and compress arbitrary whitespace to ensure predictable Regex
          body = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

          // Find the rule that created this matching
          const applicableRules = rules.filter(r => r.senderEmail === sender);
          let matched = false;

          for (const rule of applicableRules) {
            if (rule.subjectRegex && parsed.subject) {
               const subjMatch = parsed.subject.match(new RegExp(rule.subjectRegex, 'i'));
               if (!subjMatch) continue;
            }

            const bodyReg = new RegExp(rule.bodyRegex, 'is');
            const match = body.match(bodyReg);

            if (match) {
              const amountRaw = match[rule.amountGroup];
              const merchantRaw = match[rule.merchantGroup];
              let dynamicCurrency = rule.currency;
              
              if (rule.currencyGroup && match[rule.currencyGroup]) {
                let parsedCurrency = match[rule.currencyGroup].trim().toUpperCase();
                
                // Map common Spanish text formats to standard ISO codes
                if (parsedCurrency.includes('COLONES') || parsedCurrency === 'COLON') parsedCurrency = 'CRC';
                if (parsedCurrency.includes('DOLARES') || parsedCurrency.includes('DÓLARES')) parsedCurrency = 'USD';

                // Validation to ensure it looks like a currency code
                if (/^[A-Z]{3}$/.test(parsedCurrency)) {
                  dynamicCurrency = parsedCurrency;
                }
              }

              let dynamicCardLast4 = null;
              if (rule.cardGroup && match[rule.cardGroup]) {
                // Extract only numbers and get the last 4 characters using a simple regex replace
                const rawCardStr = match[rule.cardGroup].replace(/\D/g, '');
                if (rawCardStr.length >= 4) {
                  dynamicCardLast4 = rawCardStr.slice(-4);
                } else if (rawCardStr.length > 0) {
                  dynamicCardLast4 = rawCardStr; // fallback if somehow shorter
                }
              }

              if (amountRaw && merchantRaw) {
                // Parse amount (remove commas, currency symbols, etc.)
                // This is simplistic; assumes something like "1,000.50"
                const amount = parseFloat(amountRaw.replace(/[^\d.-]/g, ''));

                if (!isNaN(amount) && amount > 0) {
                  // Save pending transaction, and if it exists (e.g. was rejected), resurrect it and overwrite with new regex results
                  await prisma.pendingTransaction.upsert({
                    where: { sourceEmailId: msg.uid.toString() },
                    update: {
                      status: 'PENDING',
                      amount,
                      currency: dynamicCurrency,
                      type: rule.transactionType || 'expense',
                      cardLast4: dynamicCardLast4,
                      merchantDescription: merchantRaw.replace(/<[^>]+>/g, '').trim(),
                      rawBody: body.substring(0, 500)
                    },
                    create: {
                      familyId: config.familyId,
                      date: parsed.date || new Date(),
                      amount,
                      currency: dynamicCurrency,
                      type: rule.transactionType || 'expense',
                      cardLast4: dynamicCardLast4,
                      merchantDescription: merchantRaw.replace(/<[^>]+>/g, '').trim(),
                      sourceEmailId: msg.uid.toString(),
                      status: 'PENDING',
                      rawBody: body.substring(0, 500) // snippet for debugging
                    }
                  });
                  matched = true;
                  break; 
                }
              }
            }
          }
        }

        // Mark as seen outside the fetch loop to avoid IMAP connection deadlock
        if (uidsToMark.length > 0) {
          console.log(`Marking ${uidsToMark.length} messages as Seen...`);
          // Pass the array of UIDs joined by comma
          const uidSequence = uidsToMark.join(',');
          await client.messageFlagsAdd(uidSequence, ['\\Seen'], { uid: true });
        }
        
        console.log(`Finished fetching. Processed ${counter} messages for ${sender}.`);
      }
    } finally {
      console.log(`Releasing Mailbox Lock...`);
      lock.release();
    }
    
    console.log(`Logging out from IMAP...`);
    await client.logout();
    console.log(`Logged out.`);
  } catch (error) {
    console.error(`IMAP sync failed for family ${config.familyId}:`, error);
  }
}

async function runSyncForAll() {
  console.log('Running Email Sync Job...');
  try {
    const configs = await prisma.emailServerConfig.findMany({
      where: { isActive: true }
    });
    for (const config of configs) {
      await processEmailsForConfig(config);
    }
  } catch (error) {
    console.error('Error running sync for all:', error);
  }
}

function init() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', runSyncForAll);
  
  // Optionally run once on startup
  setTimeout(runSyncForAll, 5000);
}

module.exports = { init, runSyncForAll };
