export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

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

const BASE_URL: string =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:4103/api';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

async function request<T>(
  method: string,
  path: string,
  options?: RequestOptions
): Promise<T> {
  const url: string = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // 网络层失败（断网 / CORS / 服务宕机）：转结构化为 ApiError，避免裸 TypeError 逃逸为未处理拒绝导致白屏。
    throw new ApiError(50001, '网络请求失败，请检查网络连接后重试', 0);
  }

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
