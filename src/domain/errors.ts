export type DomainErrorCode =
  | 'asset-invalid'
  | 'asset-mismatch'
  | 'amount-invalid'
  | 'amount-overflow'
  | 'money-parse'
  | 'date-invalid'
  | 'rate-invalid'
  | 'rate-missing'
  | 'account-invalid'
  | 'category-invalid';

/** Every rule violation in `src/domain` throws this; callers branch on `code`, never on the message. */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
