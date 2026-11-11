export type CalcErrorCode =
  | 'EMPTY'
  | 'SYNTAX'
  | 'DIVIDE_BY_ZERO'
  | 'DOMAIN'
  | 'OVERFLOW';

/**
 * A recoverable error raised while tokenizing, parsing or evaluating an
 * expression. `message` is written to be shown to end users as-is.
 */
export class CalcError extends Error {
  readonly code: CalcErrorCode;

  constructor(code: CalcErrorCode, message: string) {
    super(message);
    this.name = 'CalcError';
    this.code = code;
  }
}

export const isCalcError = (value: unknown): value is CalcError =>
  value instanceof CalcError;
