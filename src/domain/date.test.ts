import { isoDate } from '@/domain/date';
import { DomainError } from '@/domain/errors';

describe('isoDate', () => {
  it('accepts a real calendar day written as YYYY-MM-DD', () => {
    expect(isoDate('2026-11-16')).toBe('2026-11-16');
    expect(isoDate('2024-02-29')).toBe('2024-02-29');
  });

  it('rejects other formats and days that do not exist', () => {
    for (const input of [
      '',
      '2026-1-5',
      '16.11.2026',
      '2026-11-16T00:00:00Z',
      '2026-02-30',
      '2025-02-29',
      '2026-13-01',
      '2026-00-10',
      '2026-01-00',
    ]) {
      expect(() => isoDate(input), input).toThrow(DomainError);
    }
  });
});
