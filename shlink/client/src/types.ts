/** 短链接（Short Link）领域类型，与后端 /api/links 返回结构一致。 */
export interface ShortLink {
  id: number;
  code: string;
  url: string;
  title: string;
  clicks: number;
  createdAt: string;
}

/** 列表接口返回：全部短链 + 汇总统计。 */
export interface LinksResponse {
  links: ShortLink[];
  summary: {
    total: number;
    totalClicks: number;
  };
}
