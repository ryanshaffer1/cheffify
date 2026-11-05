export const stringToNumber = (valueStr: string): number => {
  if (valueStr.includes(' ')) {
    const parts = valueStr.split(' ')
    if (parts.length === 2) {
      const wholeNumber = Number(parts[0])
      const fraction = fractionToDecimal(parts[1])
      return wholeNumber + fraction
    } else {
      throw new Error("Invalid number format");
    }
  }
  if (valueStr.includes('/')) {
    return fractionToDecimal(valueStr)
  }
  const numeric = Number(valueStr);
  if (isNaN(numeric)) {
    throw new Error("Invalid number format");
  }
  return numeric;
}

export const fractionToDecimal = (fractionStr: string): number => {
  // Validate the string format
  if (!fractionStr.includes('/')) {
    const num = Number(fractionStr);
    if (isNaN(num)) throw new Error("Invalid number format");
    return num;
  }

  const [numeratorStr, denominatorStr] = fractionStr.split('/');
  const numerator = Number(numeratorStr);
  const denominator = Number(denominatorStr);

  // Guard rails for invalid or zero division math
  if (isNaN(numerator) || isNaN(denominator)) {
    throw new Error("Invalid fraction format");
  }
  if (denominator === 0) {
    throw new Error("Division by zero error");
  }

  return numerator / denominator;
}

export const approximateFraction = (value: number, maxDenominator = 16): string => {
  let bestNumerator = 0;
  let bestDenominator = 1;
  let minError = Number.MAX_VALUE;

  const sign = value < 0 ? "-" : "";
  value = Math.abs(value);

  for (let d = 1; d <= maxDenominator; d++) {
    const n = Math.round(value * d);
    const error = Math.abs(value - n / d);

    if (error < minError) {
      minError = error;
      bestNumerator = n;
      bestDenominator = d;
    }
  }

  return `${sign}${bestNumerator}/${bestDenominator}`
}