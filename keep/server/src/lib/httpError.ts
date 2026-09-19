/**
 * Standard HTTP error carrying both the HTTP status and the unified business
 * `code` so the centralized error handler can emit the `{ code, message, data }`
 * envelope consistently across all apps.
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly code: number;

  constructor(status: number, code: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}
