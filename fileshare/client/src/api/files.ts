import { apiClient } from './client';
import type { SharedFile } from '../types';

/** 上传文件：以 application/octet-stream 发送原始二进制，文件名走 X-File-Name 头。 */
export async function uploadFile(file: File): Promise<SharedFile> {
  return apiClient.raw<SharedFile>(
    '/files',
    file,
    {
      'Content-Type': 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name),
    }
  );
}

/** 列出全部已分享文件（按上传时间倒序）。 */
export async function listFiles(): Promise<SharedFile[]> {
  return apiClient.get<SharedFile[]>('/files');
}

/** 按短码获取单个文件的元信息（分享页展示用）。 */
export async function getFileByCode(code: string): Promise<SharedFile> {
  return apiClient.get<SharedFile>(`/files/${encodeURIComponent(code)}/meta`);
}

/** 删除文件（同时移除服务端磁盘文件）。 */
export async function deleteFile(id: number): Promise<{ ok: boolean }> {
  return apiClient.delete<{ ok: boolean }>(`/files/${id}`);
}

/** 服务端下载端点（新窗口/跳转即可触发浏览器下载）。 */
export function downloadUrl(code: string): string {
  const base: string =
    import.meta.env.VITE_API_BASE ?? 'http://localhost:4219/api';
  return `${base}/files/${encodeURIComponent(code)}/download`;
}

/** 分享链接（本应用前端页面，可供他人访问）。 */
export function shareUrl(code: string): string {
  return `${window.location.origin}/s/${code}`;
}
