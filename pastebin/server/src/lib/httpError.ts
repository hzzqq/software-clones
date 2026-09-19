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
