/**
 * Unified API client. Wraps `fetch` with:
 *  - a configurable base URL (`VITE_API_BASE`)
 *  - the `{ code, message, data }` envelope convention
 *  - network-failure fallback (ApiError 50001) and request timeout (50002)
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

const BASE_URL: string = import.meta.env.VITE_API_BASE ?? 'http://localhost:4213/api';

const DEFAULT_TIMEOUT_MS = 30000;

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

  // 请求超时防护：避免「已连接但后端挂起 / 极慢」导致 UI 永久转圈、用户无反馈。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  if (options?.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onCallerAbort);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    // 中断（超时 / 调用方取消）→ 50002；其余网络层失败（断网 / CORS / 服务宕机）→ 50001。
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(50002, '请求超时，请稍后重试', 0);
    }
    throw new ApiError(50001, '网络请求失败，请检查网络连接后重试', 0);
  } finally {
    clearTimeout(timer);
    if (options?.signal) options.signal.removeEventListener('abort', onCallerAbort);
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
