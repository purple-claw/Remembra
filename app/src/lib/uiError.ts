import { getErrorMessage } from './errors';

const DEFAULT_UNKNOWN_MESSAGE = 'An unexpected error occurred.';

export function toFriendlyErrorMessage(error: unknown, fallback: string): string {
  const message = getErrorMessage(error).trim();
  return message && message !== DEFAULT_UNKNOWN_MESSAGE ? message : fallback;
}
