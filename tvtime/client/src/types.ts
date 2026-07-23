// TV Time 剧集追踪 —— 前端类型（与服务端一致）
export interface Show {
  id: number;
  title: string;
  note: string;
  totalEpisodes: number;
  watchedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: number;
  showId: number;
  index: number;
  /** 季编号（可选，缺失时按第 1 季处理）。 */
  season?: number;
  /** 集编号（可选，缺失时回退到 index）。 */
  number?: number;
  watched: boolean;
  watchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
