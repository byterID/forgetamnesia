export interface AppEnv {
  googleClientId: string;
}

/**
 * Dev/Prod distinction is by deployment: locally the Dev client ID comes from `.env`,
 * in production the Prod client ID is set as VITE_GOOGLE_CLIENT_ID in Cloudflare Pages.
 */
export function readEnv(source: Record<string, string | undefined>): AppEnv {
  const googleClientId = source.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!googleClientId) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID is not set. Copy .env.example to .env and fill it in (see README).',
    );
  }
  return { googleClientId };
}

/** Fails fast on first call; call it where Google sign-in is initialised (not at app start in M0). */
export function getEnv(): AppEnv {
  return readEnv(import.meta.env);
}
