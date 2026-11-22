/**
 * Centralized currency formatting utility.
 * 
 * @param {number} amount - The numeric value to format.
 * @param {string} currencyCode - The ISO code (e.g., 'USD', 'CRC').
 * @param {Array} currencies - The list of currency objects from the database.
 * @param {string} language - The user's preferred language for number formatting.
 * @returns {string} - The formatted currency string (e.g., '₡ 450.000,00').
 */
export const formatCurrency = (amount, currencyCode, currencies = [], language = 'en-US') => {
  // 1. Find the symbol from our custom data
  const currencyRecord = currencies.find(c => c.code === currencyCode);
  const symbol = currencyRecord?.symbol || currencyCode || '$';

  // 2. Format the number part using Intl.NumberFormat (style: decimal handles separators)
  const formattedNumber = new Intl.NumberFormat(language || 'en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  // 3. Combine symbol and number
  // For standard currencies like $, we usually prepend.
  // For most Latin American currencies like ₡, it's also common to prepend with a space.
  return `${symbol} ${formattedNumber}`;
};

/**
 * Computes a human-friendly exchange rate (>= 1) between two currencies.
 *
 * @param {string} srcCurrency - Source currency ISO code.
 * @param {string} dstCurrency - Destination currency ISO code.
 * @param {{ base?: string, rates?: Record<string, number> } | null} ratesData - Rates payload from /currencies/rates.
 * @returns {{ rate: number, baseCurrency: string, quoteCurrency: string, isMultiply: boolean }}
 */
export const getDefaultExchangeRate = (srcCurrency, dstCurrency, ratesData) => {
  const src = (srcCurrency || 'USD').toUpperCase();
  const dst = (dstCurrency || src).toUpperCase();

  if (src === dst) {
    return { rate: 1, baseCurrency: src, quoteCurrency: dst, isMultiply: true };
  }

  const base = (ratesData?.base || 'USD').toUpperCase();
  const rates = ratesData?.rates || {};
  let directFactor = 1;

  if (src === base && rates[dst]) {
    directFactor = rates[dst];
  } else if (dst === base && rates[src]) {
    directFactor = 1 / rates[src];
  } else if (rates[src] && rates[dst]) {
    directFactor = rates[dst] / rates[src];
  }

  if (!directFactor || directFactor <= 0) {
    directFactor = 1;
  }

  if (directFactor >= 1) {
    return {
      rate: parseFloat(directFactor.toFixed(4)),
      baseCurrency: src,
      quoteCurrency: dst,
      isMultiply: true,
    };
  }

  return {
    rate: parseFloat((1 / directFactor).toFixed(4)),
    baseCurrency: dst,
    quoteCurrency: src,
    isMultiply: false,
  };
};

/**
 * Converts an amount in source currency to destination currency using rate metadata.
 */
export const convertWithRate = (amount, rate, isMultiply) => {
  const num = parseFloat(amount);
  const r = parseFloat(rate);
  if (isNaN(num) || isNaN(r) || r <= 0) return '';
  const result = isMultiply ? num * r : num / r;
  return result.toFixed(2);
};

/**
 * Computes the effective exchange rate (>= 1 when matching orientation) from source & destination amounts.
 */
export const computeEffectiveRate = (srcAmount, dstAmount, isMultiply) => {
  const s = parseFloat(srcAmount);
  const d = parseFloat(dstAmount);
  if (isNaN(s) || isNaN(d) || s <= 0 || d <= 0) return '';
  const r = isMultiply ? d / s : s / d;
  return parseFloat(r.toFixed(4)).toString();
};
