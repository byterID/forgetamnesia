import { readEnv } from '@/env';

describe('readEnv', () => {
  it('throws a descriptive error when the client id is absent', () => {
    expect(() => readEnv({})).toThrow(/VITE_GOOGLE_CLIENT_ID/);
    expect(() => readEnv({ VITE_GOOGLE_CLIENT_ID: '  ' })).toThrow(/\.env\.example/);
  });

  it('returns the client id when present', () => {
    expect(readEnv({ VITE_GOOGLE_CLIENT_ID: 'abc.apps.googleusercontent.com' })).toEqual({
      googleClientId: 'abc.apps.googleusercontent.com',
    });
  });
});
