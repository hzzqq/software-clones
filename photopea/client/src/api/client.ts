/**
 * Unified API client. Wraps `fetch` with:
 *  - a configurable base URL (`VITE_API_BASE`)
 *  - the `{ code, message, data }` envelope convention
 *  - automatic 401/403 handling hooks (reserved for future auth)
 */

/** Shape of the standardized response envelope returned by all backend routes. */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

/** Custom error thrown when the backend returns a non-zero business code. */
export class ApiError extends Error {
  public readonly code: number;
  public readonly httpStatus: number;

  constructor(code: number, message: string, httpStatus: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const BASE_URL: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:4101/api';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

/**
 * Internal low-level request helper. Resolves with the parsed `data` field of
 * the envelope, or rejects with an {@link ApiError}.
 */
async function request<T>(method: string, path: string, options?: RequestOptions): Promise<T> {
  const url: string = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  const response: Response = await fetch(url, {
    method,
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  // Reserved hooks: surface 401/403 so the app can redirect to login later.
  if (response.status === 401 || response.status === 403) {
    console.warn(`Auth error (${response.status}) on ${method} ${path}`);
  }

  let payload: ApiEnvelope<T>;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(50000, '响应不是合法的 JSON', response.status);
  }

  if (payload.code !== 0) {
    throw new ApiError(payload.code, payload.message ?? '请求失败', response.status);
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions): Promise<T> =>
    request<T>('DELETE', path, options),
};
