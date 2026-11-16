import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) yield path;
  }
}

/** Convention enforced by test: UI code uses t(key), never literal Cyrillic text. */
describe('i18n convention', () => {
  it('has no Cyrillic literals in src/features, src/ui and src/App.tsx', () => {
    const files = [...walk('src/features'), ...walk('src/ui'), 'src/App.tsx'];
    const offenders = files.filter((f) => /[А-Яа-яЁё]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
