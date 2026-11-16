export const LOCALE = 'ru-RU';

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE, options).format(value);
}

export function formatDate(value: Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(
    LOCALE,
    options ?? { day: '2-digit', month: '2-digit', year: 'numeric' },
  ).format(value);
}
