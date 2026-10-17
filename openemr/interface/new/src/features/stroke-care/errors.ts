/**
 * Read the server's error message without leaking an `any` through the UI.
 *
 * The API returns `{ message: string | string[] }` for validation failures; a
 * network failure has no response at all. Anything unexpected falls back to a
 * sentence the clinician can act on.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const response = (error as {
      response?: { data?: { message?: unknown } };
    }).response;
    const message = response?.data?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return message.filter((m) => typeof m === 'string').join('; ');
    }
  }
  return fallback;
}
