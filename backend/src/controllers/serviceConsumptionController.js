const prisma = require('../db');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper to convert DD-MMM-YYYY Spanish date string to JS Date
function parseSpanishDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const monthAbbr = parts[1].toUpperCase();
  const year = parseInt(parts[2], 10);

  const months = {
    'ENE': 0, 'FEB': 1, 'MAR': 2, 'ABR': 3, 'MAY': 4, 'JUN': 5,
    'JUL': 6, 'AGO': 7, 'SET': 8, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DIC': 11
  };

  const month = months[monthAbbr];
  if (month === undefined) return null;

  // Use noon to avoid standard timezone offset shifts
  return new Date(year, month, day, 12, 0, 0);
}

// GET /api/service-consumption
exports.getConsumptions = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const records = await prisma.serviceConsumption.findMany({
      where: { familyId },
      orderBy: { readingDate: 'desc' }
    });
    res.json(records);
  } catch (error) {
    console.error('getConsumptions error:', error);
    res.status(500).json({ error: 'Failed to fetch service consumption logs' });
  }
};

// POST /api/service-consumption
exports.createConsumption = async (req, res) => {
  try {
    const familyId = req.user.familyId;
    const {
      serviceType,
      provider,
      nise,
      meterNumber,
      invoiceNumber,
      billingPeriod,
      readingDate,
      dueDate,
      previousReading,
      currentReading,
      consumption,
      unit,
      amount,
      currency,
      energyCost,
      publicLighting,
      tax,
      otherCharges,
      isPaid
    } = req.body;

    if (!billingPeriod || !readingDate || !dueDate || consumption === undefined || !amount) {
      return res.status(400).json({ error: 'Missing required consumption log fields' });
    }

    const record = await prisma.serviceConsumption.create({
      data: {
        familyId,
        serviceType: serviceType || 'electricity',
        provider: provider || 'CNFL',
        nise: nise || null,
        meterNumber: meterNumber || null,
        invoiceNumber: invoiceNumber || null,
        billingPeriod,
        readingDate: new Date(readingDate),
        dueDate: new Date(dueDate),
        previousReading: previousReading !== undefined ? parseFloat(previousReading) : null,
        currentReading: currentReading !== undefined ? parseFloat(currentReading) : null,
        consumption: parseFloat(consumption),
        unit: unit || 'kWh',
        amount: parseFloat(amount),
        currency: currency || 'CRC',
        energyCost: energyCost !== undefined ? parseFloat(energyCost) : null,
        publicLighting: publicLighting !== undefined ? parseFloat(publicLighting) : null,
        tax: tax !== undefined ? parseFloat(tax) : null,
        otherCharges: otherCharges !== undefined ? parseFloat(otherCharges) : null,
        isPaid: !!isPaid
      }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('createConsumption error:', error);
    res.status(500).json({ error: 'Failed to save service consumption log' });
  }
};

// PUT /api/service-consumption/:id
exports.updateConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const familyId = req.user.familyId;

    const existing = await prisma.serviceConsumption.findFirst({
      where: { id, familyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Record not found or unauthorized' });
    }

    const {
      serviceType,
      provider,
      nise,
      meterNumber,
      invoiceNumber,
      billingPeriod,
      readingDate,
      dueDate,
      previousReading,
      currentReading,
      consumption,
      unit,
      amount,
      currency,
      energyCost,
      publicLighting,
      tax,
      otherCharges,
      isPaid
    } = req.body;

    const record = await prisma.serviceConsumption.update({
      where: { id },
      data: {
        serviceType: serviceType !== undefined ? serviceType : existing.serviceType,
        provider: provider !== undefined ? provider : existing.provider,
        nise: nise !== undefined ? nise : existing.nise,
        meterNumber: meterNumber !== undefined ? meterNumber : existing.meterNumber,
        invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : existing.invoiceNumber,
        billingPeriod: billingPeriod !== undefined ? billingPeriod : existing.billingPeriod,
        readingDate: readingDate !== undefined ? new Date(readingDate) : existing.readingDate,
        dueDate: dueDate !== undefined ? new Date(dueDate) : existing.dueDate,
        previousReading: previousReading !== undefined ? parseFloat(previousReading) : existing.previousReading,
        currentReading: currentReading !== undefined ? parseFloat(currentReading) : existing.currentReading,
        consumption: consumption !== undefined ? parseFloat(consumption) : existing.consumption,
        unit: unit !== undefined ? unit : existing.unit,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        currency: currency !== undefined ? currency : existing.currency,
        energyCost: energyCost !== undefined ? parseFloat(energyCost) : existing.energyCost,
        publicLighting: publicLighting !== undefined ? parseFloat(publicLighting) : existing.publicLighting,
        tax: tax !== undefined ? parseFloat(tax) : existing.tax,
        otherCharges: otherCharges !== undefined ? parseFloat(otherCharges) : existing.otherCharges,
        isPaid: isPaid !== undefined ? !!isPaid : existing.isPaid
      }
    });

    res.json(record);
  } catch (error) {
    console.error('updateConsumption error:', error);
    res.status(500).json({ error: 'Failed to update service consumption log' });
  }
};

// DELETE /api/service-consumption/:id
exports.deleteConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const familyId = req.user.familyId;

    const existing = await prisma.serviceConsumption.findFirst({
      where: { id, familyId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Record not found or unauthorized' });
    }

    await prisma.serviceConsumption.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Consumption log deleted successfully' });
  } catch (error) {
    console.error('deleteConsumption error:', error);
    res.status(500).json({ error: 'Failed to delete service consumption log' });
  }
};

// POST /api/service-consumption/parse
exports.parseInvoicePdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  const pdfPath = req.file.path;

  // Ensure file is deleted after request resolves or errors
  const cleanup = () => {
    try {
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (err) {
      console.error('Error cleaning up temp upload:', err);
    }
  };

  try {
    // Run pdftotext -layout <path> - to get layout formatted text directly in stdout
    execFile('pdftotext', ['-layout', pdfPath, '-'], { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        console.error('pdftotext exec error:', error);
        cleanup();
        return res.status(500).json({ error: 'Failed to extract text from PDF. Make sure poppler-utils is installed.' });
      }

      try {
        const text = stdout;
        const result = {
          serviceType: 'electricity',
          provider: 'CNFL',
          currency: 'CRC',
          unit: 'kWh'
        };

        // 1. Invoice & NISE
        const invoiceNiseRegex = /\b(11\d{7})\b.*\b(\d{8})\b/;
        const invoiceNiseMatch = text.match(invoiceNiseRegex);
        if (invoiceNiseMatch) {
          result.invoiceNumber = invoiceNiseMatch[1];
          result.nise = invoiceNiseMatch[2];
        }

        // 2. Dates line
        const datesLineRegex = /¢\s*[\d,.]+\s+(\d+)\s+(\d{1,2}-[A-Z]{3}-\d{4})\s+(\d{1,2}-[A-Z]{3}-\d{4})\s+(\d{1,2}-[A-Z]{3}-\d{4})\s+(\d{1,2}-[A-Z]{3}-\d{4})/;
        const datesLineMatch = text.match(datesLineRegex);
        if (datesLineMatch) {
          result.readingDate = parseSpanishDate(datesLineMatch[2]); // FECHA FACTURA ACTUAL
        }

        // 3. Readings & Consumption
        const readingsRegex = /\s*(\d+)\s+([\d,.]+)\s+¢\s*[\d,.]+\s+(\d+)\s+(\d+)\s+(\d+)\s+(NO ESTIMADA|ESTIMADA)/;
        const readingsMatch = text.match(readingsRegex);
        if (readingsMatch) {
          result.consumption = parseInt(readingsMatch[1], 10);
          result.currentReading = parseInt(readingsMatch[3], 10);
          result.previousReading = parseInt(readingsMatch[4], 10);
        }

        // 4. Billing period (MM-YYYY)
        const periodRegex = /\b(\d{2}-\d{4})\b/;
        const periodMatch = text.match(periodRegex);
        if (periodMatch) {
          result.billingPeriod = periodMatch[1];
        }

        // 5. Cost breakdowns using specific codes
        const energyMatch = text.match(/\b1\s+ENERGÍA\s+¢\s*([\d,.]+)/);
        result.energyCost = energyMatch ? parseFloat(energyMatch[1].replace(/,/g, '')) : null;

        const publicLightingMatch = text.match(/\b6\s+ALUMBRADO PÚBLICO\s+¢\s*([\d,.]+)/);
        result.publicLighting = publicLightingMatch ? parseFloat(publicLightingMatch[1].replace(/,/g, '')) : null;

        const taxMatch = text.match(/IVG\s+IMPUESTO VALOR AGREGADO\s+¢\s*([\d,.]+)/);
        result.tax = taxMatch ? parseFloat(taxMatch[1].replace(/,/g, '')) : null;

        const firefightersMatch = text.match(/TRB\s+TRIBUTO BOMBEROS\s+¢\s*([\d,.]+)/);
        result.otherCharges = firefightersMatch ? parseFloat(firefightersMatch[1].replace(/,/g, '')) : null;

        // 6. Due Date
        const dueDateRegex = /TRIBUTO BOMBEROS.*\s+(\d{1,2}-[A-Z]{3}-\d{4})\b/;
        const dueDateMatch = text.match(dueDateRegex);
        if (dueDateMatch) {
          result.dueDate = parseSpanishDate(dueDateMatch[1]);
        }

        // 7. Total Amount
        const totalAmountRegex = /TOTAL POR PAGAR[\s\S]*?¢\s*([\d,.]+)/i;
        const totalAmountMatch = text.match(totalAmountRegex);
        if (totalAmountMatch) {
          result.amount = parseFloat(totalAmountMatch[1].replace(/,/g, ''));
        }

        cleanup();
        res.json(result);
      } catch (err) {
        console.error('Error parsing extracted text:', err);
        cleanup();
        res.status(500).json({ error: 'Error parsing invoice details from text' });
      }
    });
  } catch (err) {
    console.error('execFile setup error:', err);
    cleanup();
    res.status(500).json({ error: 'Failed to initialize PDF extraction tool' });
  }
};
