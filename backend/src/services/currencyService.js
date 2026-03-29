const axios = require('axios');
const prisma = require('../db');

const API_KEY = process.env.CURRENCY_EXCHANGE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest`;

// Fallback rates if API is unavailable (approximate)
const FALLBACK_RATES = {
  USD: 1.0,
  EUR: 0.92,
  CRC: 466.0,
  MXN: 17.0,
  GBP: 0.79,
  CAD: 1.35
};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetches latest exchange rates for a base currency.
 * Uses local database cache if available and fresh.
 */
async function getExchangeRates(base = 'USD') {
  try {
    // 1. Check Cache
    const cached = await prisma.exchangeRate.findUnique({
      where: { base }
    });

    if (cached && (Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL)) {
      return JSON.parse(cached.rates);
    }

    // 2. Fetch from API if key exists
    if (API_KEY && API_KEY !== 'your_api_key_here') {
      try {
        const response = await axios.get(`${BASE_URL}/${base}`);
        if (response.data && response.data.conversion_rates) {
          const rates = response.data.conversion_rates;

          // Update Cache
          await prisma.exchangeRate.upsert({
            where: { base },
            update: { rates: JSON.stringify(rates) },
            create: { base, rates: JSON.stringify(rates) }
          });

          return rates;
        }
      } catch (apiError) {
        console.error('Currency API Error:', apiError.message);
      }
    }

    // 3. Fallback to Database Cache (even if expired) or Hardcoded Defaults
    if (cached) {
      return JSON.parse(cached.rates);
    }

    return FALLBACK_RATES;
  } catch (error) {
    console.error('getExchangeRates Error:', error);
    return FALLBACK_RATES;
  }
}

/**
 * Converts an amount from one currency to another.
 */
async function convert(amount, from, to) {
  if (from === to) return amount;

  const rates = await getExchangeRates(from);
  if (rates && rates[to]) {
    return amount * rates[to];
  }

  // Cross-conversion if base isn't 'from'
  const usdRates = await getExchangeRates('USD');
  if (usdRates && usdRates[from] && usdRates[to]) {
    const amountInUsd = amount / usdRates[from];
    return amountInUsd * usdRates[to];
  }

  return amount; // Fallback to original if conversion fails
}

module.exports = {
  getExchangeRates,
  convert
};
