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
