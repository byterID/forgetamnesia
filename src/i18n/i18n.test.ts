import { t } from '@/i18n';
import { formatDate, formatNumber } from '@/i18n/format';

describe('t()', () => {
  it('returns the Russian string for a key', () => {
    expect(t('app.title')).toBe('ForgetAmnesia');
    expect(t('common.cancel')).toBe('Отмена');
  });

  it('interpolates params', () => {
    expect(t('common.countItems', { count: 3 })).toBe('Элементов: 3');
  });

  it('fails loudly on an unknown key', () => {
    // @ts-expect-error deliberately invalid key
    expect(() => t('no.such.key')).toThrow(/no\.such\.key/);
  });
});

describe('format helpers (ru)', () => {
  it('formats numbers with ru grouping', () => {
    expect(formatNumber(1234567.5).replace(/\s/g, ' ')).toBe('1 234 567,5');
  });
  it('formats dates in ru locale', () => {
    expect(formatDate(new Date(2026, 10, 16))).toBe('16.11.2026');
  });
});
