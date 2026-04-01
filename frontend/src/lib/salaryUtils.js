/**
 * Costa Rican Salary Deductions and Income Tax Utility
 * Based on 2025 (Decreto 44772-H) and 2026 (Decreto 45333-H)
 */

export const TAX_YEARS = {
  '2025': {
    exemption: 922000,
    brackets: [
      { min: 922000, max: 1352000, rate: 0.10 },
      { min: 1352000, max: 2373000, rate: 0.15 },
      { min: 2373000, max: 4745000, rate: 0.20 },
      { min: 4745000, max: Infinity, rate: 0.25 }
    ],
    credits: {
      child: 1720,
      spouse: 2600
    }
  },
  '2026': {
    exemption: 918000,
    brackets: [
      { min: 918000, max: 1347000, rate: 0.10 },
      { min: 1347000, max: 2364000, rate: 0.15 },
      { min: 2364000, max: 4727000, rate: 0.20 },
      { min: 4727000, max: Infinity, rate: 0.25 }
    ],
    credits: {
      child: 1710,
      spouse: 2590
    }
  }
};

export const CONTRIBUTION_RATES = {
  '2025': { sem: 0.055, ivm: 0.0417, popular: 0.01, total: 0.1067 },
  '2026': { sem: 0.055, ivm: 0.0433, popular: 0.01, total: 0.1083 }
};

export const FREQUENCY_FACTORS = {
  'monthly': 1,
  'biweekly': 2,
  'weekly': 4.3333 // 52 weeks / 12 months
};

/**
 * Calculates net salary for Costa Rica
 */
export const calculateSalaryCR = ({
  baseSalary = 0,
  bonuses = 0,
  children = 0,
  spouse = false,
  rpc = 0,
  year = '2026',
  frequency = 'monthly'
}) => {
  const factor = FREQUENCY_FACTORS[frequency] || 1;
  const rates = CONTRIBUTION_RATES[year] || CONTRIBUTION_RATES['2026'];
  const gross = parseFloat(baseSalary || 0) + parseFloat(bonuses || 0);
  
  if (gross <= 0) {
    return {
      gross: 0,
      ccss: 0,
      sem: 0,
      ivm: 0,
      popular: 0,
      renta: 0,
      rpc: 0,
      net: 0,
      aguinaldoProvision: 0,
      totalDeductions: 0
    };
  }

  // 1. Pensional Complementaria (RPC) - Deductible up to 10% of Gross
  const rpcInput = parseFloat(rpc || 0);
  const rpcDeductibleLimit = gross * 0.10;
  const rpcDeductible = Math.min(rpcInput, rpcDeductibleLimit);

  // 2. Worker Contributions Calculation (SEM, IVM, Banco Popular)
  // Base taxable = Gross - RPC
  const contributionBase = Math.max(0, gross - rpcDeductible);
  const sem = contributionBase * rates.sem;
  const ivm = contributionBase * rates.ivm;
  const popular = contributionBase * rates.popular;
  const ccss = sem + ivm + popular; // Total worker contribution

  // 3. Income Tax (Renta) Calculation
  // Base taxable = Gross - (SEM+IVM+Popular) - RPC
  const taxableBase = Math.max(0, gross - ccss - rpcDeductible);
  
  const baseConfig = TAX_YEARS[year] || TAX_YEARS['2026'];
  
  // Adjust thresholds and credits for the selected period
  const periodBrackets = baseConfig.brackets.map(b => ({
    min: b.min / factor,
    max: b.max / factor,
    rate: b.rate
  }));
  const periodCredits = {
    child: baseConfig.credits.child / factor,
    spouse: baseConfig.credits.spouse / factor
  };

  let grossTax = 0;

  periodBrackets.forEach(bracket => {
    if (taxableBase > bracket.min) {
      const taxableInBracket = Math.min(taxableBase, bracket.max) - bracket.min;
      grossTax += taxableInBracket * bracket.rate;
    }
  });

  // 4. Apply Family Credits
  const familyCredits = (children * periodCredits.child) + (spouse ? periodCredits.spouse : 0);
  const renta = Math.max(0, grossTax - familyCredits);

  // 5. Net Salary (The actual take-home from the employer)
  // RPC is NOT subtracted here because the user pays it to their bank,
  // it only reduces the tax/ccss burden.
  const net = Math.max(0, gross - ccss - renta);

  // 6. Aguinaldo (Provision per period)
  const aguinaldoProvision = gross / 12;
  const monthlyEquivalent = net * factor;

  return {
    gross,
    ccss,
    sem,
    ivm,
    popular,
    renta,
    rpcExemption: rpcInput, // Rename to clarify it's a tax exemption
    totalDeductions: ccss + renta,
    net,
    monthlyEquivalent,
    aguinaldoProvision,
    taxableBase
  };
};
