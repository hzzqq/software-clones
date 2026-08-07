// Web API 客户端 —— 前端类型（与服务端一致）
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

/** 环境：一组可在请求中以 {{key}} 引用的变量，同一时刻至多一个处于激活状态。 */
export interface Environment {
  id: number;
  name: string;
  variables: Record<string, string>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
