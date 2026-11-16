import { readFileSync } from 'node:fs';

const headers = readFileSync('public/_headers', 'utf8');
const csp = /Content-Security-Policy:\s*(.+)/.exec(headers)?.[1] ?? '';

function directive(name: string): string[] {
  const part = csp.split(';').find((d) => d.trim().startsWith(`${name} `));
  return part ? part.trim().split(/\s+/).slice(1) : [];
}

describe('public/_headers', () => {
  it('sets a strict default-src and blocks plugins/framing', () => {
    expect(directive('default-src')).toEqual(["'self'"]);
    expect(directive('object-src')).toEqual(["'none'"]);
    expect(directive('frame-ancestors')).toEqual(["'none'"]);
    expect(directive('base-uri')).toEqual(["'self'"]);
  });

  it('allows what Google Identity Services and Drive need, and nothing inline for scripts', () => {
    expect(directive('script-src')).toEqual(["'self'", 'https://accounts.google.com/gsi/client']);
    expect(directive('frame-src')).toContain('https://accounts.google.com');
    const connect = directive('connect-src');
    expect(connect).toContain('https://accounts.google.com');
    expect(connect).toContain('https://www.googleapis.com');
    expect(directive('script-src')).not.toContain("'unsafe-inline'");
  });

  it('sets baseline security headers and no-cache for the service worker', () => {
    expect(headers).toMatch(/X-Content-Type-Options:\s*nosniff/);
    expect(headers).toMatch(/Referrer-Policy:/);
    expect(headers).toMatch(/\/sw\.js\n\s+Cache-Control:\s*no-cache/);
  });
});
