import { describe, expect, it } from 'vitest';
import { ConversionError, convertUnit, parseNumericInput, UNIT_CATEGORIES } from '../src/core/units';

describe('unit conversion', () => {
  it.each([
    ['length', 1, 'mi', 'km', 1.609344],
    ['length', 12, 'in', 'ft', 1],
    ['mass', 1, 'kg', 'lb', 2.2046226218],
    ['mass', 14, 'lb', 'st', 1],
    ['area', 1, 'ha', 'm2', 10000],
    ['area', 1, 'ac', 'ft2', 43560],
    ['volume', 1, 'gal-us', 'l', 3.785411784],
    ['volume', 16, 'cup-us', 'gal-us', 1],
    ['time', 2, 'h', 'min', 120],
    ['time', 1, 'd', 's', 86400],
    ['speed', 100, 'kmh', 'mph', 62.1371192237],
    ['speed', 1, 'kn', 'kmh', 1.852],
    ['data', 1, 'GiB', 'MiB', 1024],
    ['data', 1, 'GB', 'MB', 1000],
    ['data', 1, 'B', 'bit', 8],
  ] as const)('%s: %d %s → %s', (category, value, from, to, expected) => {
    expect(convertUnit(value, category, from, to)).toBeCloseTo(expected, 8);
  });

  it('converts temperatures (affine scales)', () => {
    expect(convertUnit(100, 'temperature', 'c', 'f')).toBeCloseTo(212, 10);
    expect(convertUnit(-40, 'temperature', 'f', 'c')).toBeCloseTo(-40, 10);
    expect(convertUnit(0, 'temperature', 'k', 'c')).toBeCloseTo(-273.15, 10);
    expect(convertUnit(98.6, 'temperature', 'f', 'k')).toBeCloseTo(310.15, 10);
  });

  it('round-trips every unit in every category', () => {
    for (const category of UNIT_CATEGORIES) {
      const [base] = category.units;
      for (const unit of category.units) {
        const there = convertUnit(42, category.id, base!.id, unit.id);
        expect(convertUnit(there, category.id, unit.id, base!.id)).toBeCloseTo(42, 9);
      }
    }
  });

  it('rejects impossible values', () => {
    expect(() => convertUnit(-1, 'length', 'm', 'ft')).toThrow(ConversionError);
    expect(() => convertUnit(-1, 'temperature', 'k', 'c')).toThrow(/absolute zero/);
    expect(() => convertUnit(-500, 'temperature', 'f', 'c')).toThrow(/absolute zero/);
    expect(() => convertUnit(1, 'length', 'm', 'parsec')).toThrow(/Unknown/);
  });

  it('parses user input', () => {
    expect(parseNumericInput('1,234.5')).toBe(1234.5);
    expect(parseNumericInput(' 2e3 ')).toBe(2000);
    expect(parseNumericInput('−40')).toBe(-40);
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('12abc')).toBeNaN();
    expect(parseNumericInput('1.2.3')).toBeNaN();
  });
});
