/**
 * 文件分享服务端数据类型定义。
 */

/** 服务端文件记录（DB snake_case → API camelCase）。 */
export interface SharedFile {
  id: number;
  code: string;
  originalName: string;
  size: number;
  mimeType: string;
  downloadCount: number;
  createdAt: string;
}
