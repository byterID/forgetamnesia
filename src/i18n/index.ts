import ru from './ru.json';

export type MessageKey = keyof typeof ru;

/** Translates a key to Russian. An unknown key throws, so typos surface in dev and tests. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = (ru as Record<string, string | undefined>)[key];
  if (template === undefined) throw new Error(`Unknown i18n key: ${key}`);
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

/** Hook form for components; one locale for now, kept as a hook so a switch later is local. */
export function useT(): typeof t {
  return t;
}
