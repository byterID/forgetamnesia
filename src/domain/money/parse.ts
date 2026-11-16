import { DomainError } from '@/domain/errors';
import type { Asset } from './asset';
import { money, type Money } from './money';

/** Exactly one separator: it is the decimal one ("1,000" is one, not a thousand). */
const SINGLE_SEPARATOR = /^(\d*)[.,](\d*)$/;
/** No separator at all, or comma groups with an optional dot decimal part: "1,234,567.8". */
const COMMA_GROUPS = /^(\d{1,3}(?:,\d{3})+|\d*)(?:\.(\d*))?$/;
/** Dot groups with an optional comma decimal part: "1.234.567,8". */
const DOT_GROUPS = /^(\d{1,3}(?:\.\d{3})+|\d*)(?:,(\d*))?$/;

const MAX_UNITS = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Turns user input ("5 000,50", "-12.3", "1,234.56") into Money without ever touching a float.
 * Spaces of any kind and apostrophes are group separators; `,` and `.` are told apart by position.
 * Throws `money-parse` on anything ambiguous or malformed, `amount-overflow` beyond the safe range.
 */
export function parseMoney(input: string, asset: Asset): Money {
  const compact = input.replace(/[\s'’]/g, '');
  const body = compact.replace(/^[-−+]/, '');
  const match = SINGLE_SEPARATOR.exec(body) ?? COMMA_GROUPS.exec(body) ?? DOT_GROUPS.exec(body);
  if (!match) throw new DomainError('money-parse', `Not an amount: "${input}"`);

  const [, grouped = '', fraction = ''] = match;
  const whole = grouped.replace(/[.,]/g, '');
  if (whole.length + fraction.length === 0) {
    throw new DomainError('money-parse', `Not an amount: "${input}"`);
  }
  if (fraction.length > asset.decimals) {
    throw new DomainError(
      'money-parse',
      `${asset.code} has ${String(asset.decimals)} decimals, got "${input}"`,
    );
  }

  const units = BigInt(whole + fraction.padEnd(asset.decimals, '0'));
  if (units > MAX_UNITS) {
    throw new DomainError('amount-overflow', `Amount is too large: "${input}"`);
  }
  return money(/^[-−]/.test(compact) ? -Number(units) : Number(units), asset);
}
