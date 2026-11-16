/** Drops keys whose value is `undefined`, so optional fields are absent rather than stored empty. */
export function omitUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}
