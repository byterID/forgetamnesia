import { DomainError } from '@/domain/errors';

/** A local calendar day, `YYYY-MM-DD` (ADR-024). Plain strings of this shape compare chronologically. */
export type IsoDate = string;

/** Validates that the string is a real calendar day and returns it. */
export function isoDate(value: string): IsoDate {
  const probe = new Date(`${value}T00:00:00Z`);
  // A day that does not exist is either invalid or rolls over (Feb 30 -> Mar 2) and so no longer
  // prints as the input.
  const real =
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(probe.getTime()) &&
    probe.toISOString().startsWith(value);
  if (!real) {
    throw new DomainError('date-invalid', `Not a calendar day (YYYY-MM-DD): "${value}"`);
  }
  return value;
}
