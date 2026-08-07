import { apiClient } from './client';
import type { VaultEntry, VaultEntryInput, VaultFilter } from '../types';

/**
 * 密码保险库条目 API。
 * 密码字段由服务端以 AES-256-GCM 加密后落库；响应中的 password 为解密后的明文，
 * 仅用于前端展示与一键复制。
 */
export const entriesApi = {
  list(filter: VaultFilter): Promise<VaultEntry[]> {
    const params = new URLSearchParams();
    if (filter.q.trim()) params.set('q', filter.q.trim());
    if (filter.category && filter.category !== '全部') params.set('category', filter.category);
    const qs = params.toString();
    return apiClient.get<VaultEntry[]>(`/entries${qs ? `?${qs}` : ''}`);
  },

  get(id: number): Promise<VaultEntry> {
    return apiClient.get<VaultEntry>(`/entries/${id}`);
  },

  create(input: VaultEntryInput): Promise<VaultEntry> {
    return apiClient.post<VaultEntry>('/entries', input);
  },

  update(id: number, input: Partial<VaultEntryInput>): Promise<VaultEntry> {
    return apiClient.patch<VaultEntry>(`/entries/${id}`, input);
  },

  remove(id: number): Promise<null> {
    return apiClient.delete<null>(`/entries/${id}`);
  },
};
