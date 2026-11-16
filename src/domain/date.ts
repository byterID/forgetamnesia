import { DomainError } from '@/domain/errors';

/** A local calendar day, `YYYY-MM-DD` (ADR-024). Plain strings of this shape compare chronologically. */
export type IsoDate = string;

/** Validates that the string is a real calendar day and returns it. */
export function isoDate(value: string): IsoDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const [year, month, day] = (match ?? []).slice(1).map(Number);
  const probe = new Date(Date.UTC(year ?? Number.NaN, (month ?? Number.NaN) - 1, day));
  // A day that does not exist rolls over (Feb 30 -> Mar 2), so it no longer prints as the input.
  if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== value) {
    throw new DomainError('date-invalid', `Not a calendar day (YYYY-MM-DD): "${value}"`);
  }
  return value;
}
