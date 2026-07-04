import { isAxiosError } from "axios";

/**
 * Translates a raw API/network error into learner-friendly copy.
 * The raw error (status, technical message) is logged for DevTools/log
 * inspection but never shown to the user — only the mapped sentence is.
 */
export function getFriendlyErrorMessage(err: unknown, fallback: string): string {
  if (process.env.NODE_ENV !== "test") {
    console.error(err);
  }

  if (!isAxiosError(err)) {
    return fallback;
  }

  if (!err.response) {
    return "You appear to be offline, or the server isn't responding. Check your connection and try again.";
  }

  // Only override with a generic message where the status code means the same
  // thing in every context. Codes like 401/403/404/422 vary by call site (e.g.
  // a 401 on login means "wrong password", not "session expired" elsewhere) —
  // for those, defer to the caller's tailored fallback instead of guessing.
  switch (err.response.status) {
    case 409:
      return "This changed somewhere else in the meantime. We've refreshed it to the latest version so you can continue.";
    case 429:
      return "You're doing that a bit too fast. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Something went wrong on our end. Please try again in a moment.";
    default:
      return fallback;
  }
}
