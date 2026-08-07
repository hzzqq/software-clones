/**
 * 文件分享应用的数据类型定义（与后端 REST 信封 data 字段一致）。
 */

/** 服务端文件记录（camelCase ↔ DB snake_case）。 */
export interface SharedFile {
  id: number;
  code: string;
  originalName: string;
  size: number;
  mimeType: string;
  downloadCount: number;
  createdAt: string;
}

/** 统一响应信封。 */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}
