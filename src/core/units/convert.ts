import { UNIT_CATEGORIES, type CategoryId, type Unit, type UnitCategory } from './units';

export class ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionError';
  }
}

/** Absolute zero, in °C. */
const ABSOLUTE_ZERO_C = -273.15;

export function getCategory(id: CategoryId): UnitCategory {
  const category = UNIT_CATEGORIES.find((c) => c.id === id);
  if (!category) throw new ConversionError(`Unknown category “${id}”`);
  return category;
}

export function getUnit(category: UnitCategory, unitId: string): Unit {
  const unit = category.units.find((u) => u.id === unitId);
  if (!unit) throw new ConversionError(`Unknown ${category.name.toLowerCase()} unit “${unitId}”`);
  return unit;
}

const toBase = (unit: Unit, value: number) => ('factor' in unit ? value * unit.factor : unit.toBase(value));
const fromBase = (unit: Unit, value: number) => ('factor' in unit ? value / unit.factor : unit.fromBase(value));

/**
 * Converts `value` between two units of the same category.
 * @throws ConversionError for unknown units or physically impossible input.
 */
export function convertUnit(value: number, categoryId: CategoryId, fromId: string, toId: string): number {
  if (!Number.isFinite(value)) throw new ConversionError('Enter a valid number');

  const category = getCategory(categoryId);
  const from = getUnit(category, fromId);
  const to = getUnit(category, toId);

  if (!category.allowNegative && value < 0) {
    throw new ConversionError(`${category.name} can’t be negative`);
  }

  const base = toBase(from, value);

  if (category.id === 'temperature' && base < ABSOLUTE_ZERO_C - 1e-9) {
    throw new ConversionError('That’s below absolute zero (−273.15 °C)');
  }

  if (fromId === toId) return value;
  return fromBase(to, base);
}

/**
 * Parses free-form numeric input ("1,234.5", " 2e3 ", "-40").
 * Returns null for empty input, NaN for invalid input.
 */
export function parseNumericInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, '').replace(/−/g, '-');
  if (cleaned === '') return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

/** Readable output for converted values: up to 10 significant digits. */
export function formatConverted(value: number, locale?: string): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e15 || abs < 1e-6) {
    return value.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', ' × 10^').replace('e-', ' × 10^-');
  }
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 10 }).format(value);
}
