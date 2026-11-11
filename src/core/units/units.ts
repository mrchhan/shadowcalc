/**
 * Unit definitions. Every linear unit is expressed as a factor relative to
 * the category's base unit (SI where one exists), so any-to-any conversion is
 * `value * from.factor / to.factor`. Temperature is affine and uses explicit
 * functions instead.
 *
 * Factors use exact definitions where they exist (e.g. 1 in = 0.0254 m,
 * 1 lb = 0.45359237 kg, 1 US gal = 231 in³).
 */

export interface LinearUnit {
  id: string;
  name: string;
  symbol: string;
  factor: number;
}

export interface AffineUnit {
  id: string;
  name: string;
  symbol: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

export type Unit = LinearUnit | AffineUnit;

export interface UnitCategory {
  id: CategoryId;
  name: string;
  /** Whether negative values are physically meaningful. */
  allowNegative: boolean;
  /** Default "from" and "to" units when the category is selected. */
  defaults: [string, string];
  units: Unit[];
}

export type CategoryId =
  | 'length'
  | 'mass'
  | 'temperature'
  | 'area'
  | 'volume'
  | 'time'
  | 'speed'
  | 'data';

const INCH = 0.0254;
const FOOT = 0.3048;
const YARD = 0.9144;
const MILE = 1609.344;
const POUND = 0.45359237;
const US_GALLON = 3.785411784; // litres
const IMP_GALLON = 4.54609; // litres

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    allowNegative: false,
    defaults: ['m', 'ft'],
    units: [
      { id: 'mm', name: 'Millimetre', symbol: 'mm', factor: 0.001 },
      { id: 'cm', name: 'Centimetre', symbol: 'cm', factor: 0.01 },
      { id: 'm', name: 'Metre', symbol: 'm', factor: 1 },
      { id: 'km', name: 'Kilometre', symbol: 'km', factor: 1000 },
      { id: 'in', name: 'Inch', symbol: 'in', factor: INCH },
      { id: 'ft', name: 'Foot', symbol: 'ft', factor: FOOT },
      { id: 'yd', name: 'Yard', symbol: 'yd', factor: YARD },
      { id: 'mi', name: 'Mile', symbol: 'mi', factor: MILE },
      { id: 'nmi', name: 'Nautical mile', symbol: 'nmi', factor: 1852 },
    ],
  },
  {
    id: 'mass',
    name: 'Mass / Weight',
    allowNegative: false,
    defaults: ['kg', 'lb'],
    units: [
      { id: 'mg', name: 'Milligram', symbol: 'mg', factor: 1e-6 },
      { id: 'g', name: 'Gram', symbol: 'g', factor: 0.001 },
      { id: 'kg', name: 'Kilogram', symbol: 'kg', factor: 1 },
      { id: 't', name: 'Tonne', symbol: 't', factor: 1000 },
      { id: 'oz', name: 'Ounce', symbol: 'oz', factor: POUND / 16 },
      { id: 'lb', name: 'Pound', symbol: 'lb', factor: POUND },
      { id: 'st', name: 'Stone', symbol: 'st', factor: POUND * 14 },
      { id: 'ton-us', name: 'US ton', symbol: 'ton', factor: POUND * 2000 },
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    allowNegative: true,
    defaults: ['c', 'f'],
    units: [
      { id: 'c', name: 'Celsius', symbol: '°C', toBase: (v) => v, fromBase: (v) => v },
      {
        id: 'f',
        name: 'Fahrenheit',
        symbol: '°F',
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32,
      },
      { id: 'k', name: 'Kelvin', symbol: 'K', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'area',
    name: 'Area',
    allowNegative: false,
    defaults: ['m2', 'ft2'],
    units: [
      { id: 'cm2', name: 'Square centimetre', symbol: 'cm²', factor: 1e-4 },
      { id: 'm2', name: 'Square metre', symbol: 'm²', factor: 1 },
      { id: 'ha', name: 'Hectare', symbol: 'ha', factor: 1e4 },
      { id: 'km2', name: 'Square kilometre', symbol: 'km²', factor: 1e6 },
      { id: 'in2', name: 'Square inch', symbol: 'in²', factor: INCH ** 2 },
      { id: 'ft2', name: 'Square foot', symbol: 'ft²', factor: FOOT ** 2 },
      { id: 'yd2', name: 'Square yard', symbol: 'yd²', factor: YARD ** 2 },
      { id: 'ac', name: 'Acre', symbol: 'ac', factor: 4046.8564224 },
      { id: 'mi2', name: 'Square mile', symbol: 'mi²', factor: MILE ** 2 },
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    allowNegative: false,
    defaults: ['l', 'gal-us'],
    units: [
      { id: 'ml', name: 'Millilitre', symbol: 'mL', factor: 0.001 },
      { id: 'l', name: 'Litre', symbol: 'L', factor: 1 },
      { id: 'm3', name: 'Cubic metre', symbol: 'm³', factor: 1000 },
      { id: 'tsp-us', name: 'Teaspoon (US)', symbol: 'tsp', factor: US_GALLON / 768 },
      { id: 'tbsp-us', name: 'Tablespoon (US)', symbol: 'tbsp', factor: US_GALLON / 256 },
      { id: 'floz-us', name: 'Fluid ounce (US)', symbol: 'fl oz', factor: US_GALLON / 128 },
      { id: 'cup-us', name: 'Cup (US)', symbol: 'cup', factor: US_GALLON / 16 },
      { id: 'pt-us', name: 'Pint (US)', symbol: 'pt', factor: US_GALLON / 8 },
      { id: 'gal-us', name: 'Gallon (US)', symbol: 'gal', factor: US_GALLON },
      { id: 'gal-imp', name: 'Gallon (Imperial)', symbol: 'imp gal', factor: IMP_GALLON },
      { id: 'ft3', name: 'Cubic foot', symbol: 'ft³', factor: FOOT ** 3 * 1000 },
    ],
  },
  {
    id: 'time',
    name: 'Time',
    allowNegative: false,
    defaults: ['h', 'min'],
    units: [
      { id: 'ms', name: 'Millisecond', symbol: 'ms', factor: 0.001 },
      { id: 's', name: 'Second', symbol: 's', factor: 1 },
      { id: 'min', name: 'Minute', symbol: 'min', factor: 60 },
      { id: 'h', name: 'Hour', symbol: 'h', factor: 3600 },
      { id: 'd', name: 'Day', symbol: 'd', factor: 86400 },
      { id: 'wk', name: 'Week', symbol: 'wk', factor: 604800 },
      { id: 'mo', name: 'Month (avg.)', symbol: 'mo', factor: 2629746 },
      { id: 'yr', name: 'Year (avg.)', symbol: 'yr', factor: 31556952 },
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    allowNegative: false,
    defaults: ['kmh', 'mph'],
    units: [
      { id: 'mps', name: 'Metres per second', symbol: 'm/s', factor: 1 },
      { id: 'kmh', name: 'Kilometres per hour', symbol: 'km/h', factor: 1000 / 3600 },
      { id: 'mph', name: 'Miles per hour', symbol: 'mph', factor: MILE / 3600 },
      { id: 'fps', name: 'Feet per second', symbol: 'ft/s', factor: FOOT },
      { id: 'kn', name: 'Knot', symbol: 'kn', factor: 1852 / 3600 },
    ],
  },
  {
    id: 'data',
    name: 'Data storage',
    allowNegative: false,
    defaults: ['GB', 'MB'],
    units: [
      { id: 'bit', name: 'Bit', symbol: 'bit', factor: 1 / 8 },
      { id: 'B', name: 'Byte', symbol: 'B', factor: 1 },
      { id: 'kB', name: 'Kilobyte', symbol: 'kB', factor: 1e3 },
      { id: 'MB', name: 'Megabyte', symbol: 'MB', factor: 1e6 },
      { id: 'GB', name: 'Gigabyte', symbol: 'GB', factor: 1e9 },
      { id: 'TB', name: 'Terabyte', symbol: 'TB', factor: 1e12 },
      { id: 'KiB', name: 'Kibibyte', symbol: 'KiB', factor: 1024 },
      { id: 'MiB', name: 'Mebibyte', symbol: 'MiB', factor: 1024 ** 2 },
      { id: 'GiB', name: 'Gibibyte', symbol: 'GiB', factor: 1024 ** 3 },
      { id: 'TiB', name: 'Tebibyte', symbol: 'TiB', factor: 1024 ** 4 },
    ],
  },
];
