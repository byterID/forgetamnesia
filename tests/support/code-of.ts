import { DomainError, type DomainErrorCode } from '@/domain/errors';

/**
 * Runs `run` and returns the code of the `DomainError` it throws, or `undefined` when it does not
 * throw. Any other error is a bug in the test or the code and is rethrown.
 */
export function codeOf(run: () => unknown): DomainErrorCode | undefined {
  try {
    run();
  } catch (error) {
    if (error instanceof DomainError) return error.code;
    throw error;
  }
  return undefined;
}
