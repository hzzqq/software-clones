import { apiClient, ApiError, API_BASE } from './client';

/** 资源（图片）元信息。 */
export interface Asset {
  id: number;
  code: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  createdAt: string;
  albums?: Album[];
  tags?: Tag[];
}

export interface Album {
  id: number;
  name: string;
  createdAt: string;
  assetCount?: number;
}

export interface Tag {
  id: number;
  name: string;
  count?: number;
}

/** 资源文件（图片）的可访问 URL，供 <img> 缩略图与灯箱使用。 */
export function assetFileUrl(id: number): string {
  return `${API_BASE}/assets/${id}/file`;
}

/** 顺序多文件上传：每个文件一次原始二进制 POST（零 multer）。 */
export async function uploadAsset(
  file: File,
  meta?: { width?: number; height?: number; takenAt?: string | null }
): Promise<Asset> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'X-File-Name': encodeURIComponent(file.name),
    'X-Mime-Type': file.type || 'application/octet-stream',
  };
  if (meta?.width) headers['X-Width'] = String(meta.width);
  if (meta?.height) headers['X-Height'] = String(meta.height);
  if (meta?.takenAt) headers['X-Taken-At'] = meta.takenAt;

  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers,
    body: file,
  });
  if (!res.ok) {
    let message = '上传失败';
    try {
      const payload = await res.json();
      message = payload.message ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(50000, message, res.status);
  }
  const payload = (await res.json()) as { code: number; message: string; data: Asset };
  if (payload.code !== 0) {
    throw new ApiError(payload.code, payload.message, res.status);
  }
  return payload.data;
}

export const galleryApi = {
  listAssets: (params?: { album?: number; tag?: string; from?: string; to?: string }) =>
    apiClient.get<Asset[]>('/assets' + buildQuery(params)),
  getAsset: (id: number) => apiClient.get<Asset>(`/assets/${id}`),
  deleteAsset: (id: number) => apiClient.delete<void>(`/assets/${id}`),

  listAlbums: () => apiClient.get<Album[]>('/albums'),
  createAlbum: (name: string) => apiClient.post<Album>('/albums', { name }),
  renameAlbum: (id: number, name: string) => apiClient.patch<Album>(`/albums/${id}`, { name }),
  deleteAlbum: (id: number) => apiClient.delete<void>(`/albums/${id}`),
  albumAssets: (id: number) => apiClient.get<Asset[]>(`/albums/${id}/assets`),
  addToAlbum: (id: number, assetIds: number[]) =>
    apiClient.post<{ added: number }>(`/albums/${id}/assets`, { assetIds }),
  removeFromAlbum: (id: number, assetId: number) =>
    apiClient.delete<void>(`/albums/${id}/assets/${assetId}`),

  listTags: () => apiClient.get<Tag[]>('/tags'),
  tagAsset: (id: number, name: string) => apiClient.post<Tag>(`/assets/${id}/tags`, { name }),
  untagAsset: (id: number, tagId: number) =>
    apiClient.delete<void>(`/assets/${id}/tags/${tagId}`),
};

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}
