/** 短链接（Short Link）领域类型，JSON 侧使用 camelCase。 */
export interface ShortLink {
  id: number;
  code: string;
  url: string;
  title: string;
  clicks: number;
  createdAt: string;
}

/** 数据库行（snake_case），与 camelCase 领域类型互转。 */
export interface ShortLinkRow {
  id: number;
  code: string;
  url: string;
  title: string;
  clicks: number;
  created_at: string;
}
