// TV Time 剧集追踪 —— 服务端类型

export type ISODate = string;

export interface Show {
  id: number;
  title: string;
  note: string;
  totalEpisodes: number;
  watchedCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Episode {
  id: number;
  showId: number;
  index: number;
  watched: boolean;
  watchedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreateShowInput {
  title: string;
  totalEpisodes?: number;
  note?: string;
}

export interface UpdateShowInput {
  title?: string;
  note?: string;
  totalEpisodes?: number;
}
