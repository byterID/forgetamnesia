import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { manifest } from '@/pwa/manifest';

describe('PWA manifest', () => {
  it('is installable standalone with start_url', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.name).toBe('ForgetAmnesia');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.start_url).toBe('/');
  });

  it('declares a capture shortcut', () => {
    expect(manifest.shortcuts).toEqual([
      expect.objectContaining({ url: '/capture', name: expect.any(String) as string }),
    ]);
  });

  it('declares a GET share target', () => {
    expect(manifest.share_target).toMatchObject({ action: '/capture', method: 'GET' });
    expect(manifest.share_target.params).toHaveProperty('text');
  });

  it('has 192, 512 and maskable icons that exist on disk', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      expect(existsSync(resolve('public', icon.src.replace(/^\//, '')))).toBe(true);
    }
  });
});
