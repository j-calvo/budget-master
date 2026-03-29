import React, { useState, useEffect, forwardRef } from 'react';

/**
 * AmountInput - A premium numeric input that handles dots/commas gracefully,
 * strips formatting on paste, and optimizes for mobile decimal keypads.
 */
const AmountInput = forwardRef(({ 
  value, 
  onChange, 
  placeholder = "0.00", 
  className = "", 
  required = false,
  autoFocus = false,
  id,
  name,
  disabled = false,
  onFocus,
  onBlur
}, ref) => {
  // Local state to track display (allows typing separators like "1.")
  const [displayValue, setDisplayValue] = useState(value !== undefined && value !== null ? value.toString() : '');

  // Sync internal display state with prop value (e.g. form resets)
  useEffect(() => {
    const normalizedIn = value !== undefined && value !== null ? value.toString() : '';
    // Use the normalized version (replacing comma with dot for internal check)
    if (normalizedIn !== displayValue.replace(',', '.')) {
      setDisplayValue(normalizedIn);
    }
  }, [value]);

  /**
   * Smartly cleans numeric input by:
   * 1. Stripping non-numeric characters (except . and ,)
   * 2. Finding the actual decimal separator (favoring the last one if both exist)
   * 3. Normalizing to dot (.) for internal JS state
   */
  const cleanNumericString = (raw) => {
    if (typeof raw !== 'string') return '';
    
    // 1. Basic strip: digits, dot, comma, minus
    let cleaned = raw.replace(/[^\d.,-]/g, '');

    // 2. Resolve ambiguous decimal separators
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    if (lastDot !== -1 && lastComma !== -1) {
      if (lastDot > lastComma) {
        // Dot is decimal (e.g. 1,000.50)
        cleaned = cleaned.replace(/,/g, '');
      } else {
        // Comma is decimal (e.g. 1.000,50)
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    } else {
      // Only one type exists or none. Normalize comma to dot.
      cleaned = cleaned.replace(',', '.');
    }

    // 3. Prevent multiple dots
    const firstDotIdx = cleaned.indexOf('.');
    if (firstDotIdx !== -1) {
      const beforeDot = cleaned.substring(0, firstDotIdx + 1);
      const afterDot = cleaned.substring(firstDotIdx + 1).replace(/\./g, '');
      cleaned = beforeDot + afterDot;
    }

    // 4. Handle minus sign correctly
    if (cleaned.includes('-')) {
      const isNegative = cleaned.startsWith('-');
      cleaned = (isNegative ? '-' : '') + cleaned.replace(/-/g, '');
    }

    return cleaned;
  };

  const handleChange = (e) => {
    const rawInput = e.target.value;
    
    // Allow user to start with a separator or type it at the end
    if (rawInput === '.' || rawInput === ',') {
      setDisplayValue(rawInput);
      onChange({ target: { name, value: '0.', id } });
      return;
    }

    const endsWithSep = rawInput.endsWith('.') || rawInput.endsWith(',');
    const cleaned = cleanNumericString(rawInput);

    // Update display (preserving the trailing separator if they're still typing)
    if (endsWithSep && !cleaned.includes('.')) {
      setDisplayValue(cleaned + '.');
    } else if (rawInput === '') {
      setDisplayValue('');
    } else {
      setDisplayValue(cleaned);
    }

    // Always fire the normalized "dot" string back to parent
    onChange({ target: { name, value: cleaned, id } });
  };

  const handleFocus = (e) => {
    e.target.select();
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    // On blur, settle the display value to exactly match the parent state
    setDisplayValue(cleanNumericString(displayValue));
    if (onBlur) onBlur(e);
  };

  return (
    <input
      type="text"
      ref={ref}
      id={id}
      name={name}
      inputMode="decimal"
      autoComplete="off"
      required={required}
      autoFocus={autoFocus}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
});

AmountInput.displayName = 'AmountInput';

export default AmountInput;
