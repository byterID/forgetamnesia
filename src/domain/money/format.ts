import type { Money } from './money';

export interface FormatMoneyOptions {
  /** BCP 47 locale; the app is Russian-only for now. */
  locale?: string;
  signDisplay?: Intl.NumberFormatOptions['signDisplay'];
}

/** Non-breaking space between a number and a coin code, as `Intl` puts before a currency sign. */
const NBSP = String.fromCharCode(0xa0);

/** Exact amount in major units as a plain decimal string: "5000.50", "-0.07", "1500". */
export function moneyToDecimalString(value: Money): string {
  const { decimals } = value.asset;
  const digits = String(Math.abs(value.amount)).padStart(decimals + 1, '0');
  const cut = digits.length - decimals;
  const fraction = decimals > 0 ? `.${digits.slice(cut)}` : '';
  return `${value.amount < 0 ? '-' : ''}${digits.slice(0, cut)}${fraction}`;
}

/**
 * Display text. `Intl` receives the exact decimal string, never a float, so no digit is lost.
 * Fiat is a currency ("5 000,50 ₽"); a coin is a number plus its code ("1,5 BTC"), because
 * `Intl` only knows three-letter currency codes.
 */
export function formatMoney(value: Money, options: FormatMoneyOptions = {}): string {
  const { locale = 'ru-RU', signDisplay = 'auto' } = options;
  const exact = moneyToDecimalString(value) as Intl.StringNumericLiteral;
  if (value.asset.type === 'fiat') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: value.asset.code,
      signDisplay,
    }).format(exact);
  }
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: value.asset.decimals,
    signDisplay,
  }).format(exact);
  return `${number}${NBSP}${value.asset.code}`;
}
