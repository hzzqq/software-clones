import { apiClient, API_BASE } from './client';

/** 目录项。 */
export interface FsEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number | null;
  modified: string;
}

/** 目录浏览结果。 */
export interface BrowseResult {
  path: string;
  parent: string;
  entries: FsEntry[];
}

export interface Share {
  id: number;
  code: string;
  path: string;
  expiry: string | null;
  createdAt: string;
}

export interface Bookmark {
  id: number;
  path: string;
  name: string;
  createdAt: string;
}

/** 各操作的 URL 构造器（供 <a>/<img> 直连后端流式接口）。 */
export function previewUrl(p: string): string {
  return `${API_BASE}/preview?path=${encodeURIComponent(p)}`;
}
export function downloadUrl(p: string): string {
  return `${API_BASE}/download?path=${encodeURIComponent(p)}`;
}
export function shareDownloadUrl(code: string): string {
  return `${API_BASE}/s/${code}`;
}

export const fmApi = {
  browse: (p = '/') => apiClient.get<BrowseResult>('/browse?path=' + encodeURIComponent(p)),
  createShare: (path: string, expiry?: string | null) =>
    apiClient.post<Share>('/shares', { path, expiry }),
  listShares: () => apiClient.get<Share[]>('/shares'),
  deleteShare: (id: number) => apiClient.delete<void>(`/shares/${id}`),
  createBookmark: (path: string, name: string) =>
    apiClient.post<Bookmark>('/bookmarks', { path, name }),
  listBookmarks: () => apiClient.get<Bookmark[]>('/bookmarks'),
  deleteBookmark: (id: number) => apiClient.delete<void>(`/bookmarks/${id}`),
};
