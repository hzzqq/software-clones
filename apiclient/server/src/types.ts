// Web API 客户端（Hoppscotch 核心）—— 服务端类型

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ProxyRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
}

export interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
}

export interface SavedRequest {
  id: number;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  id: number;
  method: HttpMethod;
  url: string;
  status: number;
  statusText: string;
  timeMs: number;
  createdAt: string;
}

export interface CreateRequestInput {
  name?: string;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
  folder?: string;
}

export interface UpdateRequestInput {
  name?: string;
  method?: HttpMethod;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  body?: string;
  folder?: string;
}
