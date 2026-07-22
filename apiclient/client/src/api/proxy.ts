import { apiClient } from './client';
import type { ProxyRequest, ProxyResponse } from '../types';

export const proxyApi = {
  send: (input: ProxyRequest) => apiClient.post<ProxyResponse>('/proxy', input),
};
