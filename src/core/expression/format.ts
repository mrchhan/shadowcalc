/** Significant digits shown for results (doubles carry ~15–17). */
const SIGNIFICANT_DIGITS = 12;
const LARGE_THRESHOLD = 1e15;
const SMALL_THRESHOLD = 1e-6;

function trimExponential(value: number, digits: number): string {
  const [mantissa = '0', exponent = '0'] = value.toExponential(digits - 1).split('e');
  const cleanMantissa = mantissa.includes('.') ? mantissa.replace(/\.?0+$/, '') : mantissa;
  const exp = Number(exponent);
  return `${cleanMantissa}E${exp < 0 ? '-' : '+'}${Math.abs(exp)}`;
}

/**
 * Formats a number so that it reads cleanly *and* can be parsed again by the
 * tokenizer (no grouping separators, uppercase `E` for scientific notation).
 * Floating-point noise such as 0.1 + 0.2 = 0.30000000000000004 is rounded
 * away by limiting the output to 12 significant digits.
 */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  if (value === 0) return '0';

  const abs = Math.abs(value);
  if (abs >= LARGE_THRESHOLD || abs < SMALL_THRESHOLD) {
    return trimExponential(value, SIGNIFICANT_DIGITS);
  }

  const rounded = Number(value.toPrecision(SIGNIFICANT_DIGITS));
  if (rounded === 0) return '0';
  // Number#toString avoids trailing zeros; the thresholds above guarantee it
  // will not switch to exponent notation here.
  return rounded.toString();
}

/** Adds thousands separators to a formatted result, for display only. */
export function groupDigits(formatted: string): string {
  const match = /^(-?)(\d+)(\.\d+)?(E[+-]\d+)?$/.exec(formatted);
  if (!match) return formatted;
  const [, sign = '', integer = '', fraction = '', exponent = ''] = match;
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${grouped}${fraction}${exponent}`;
}
