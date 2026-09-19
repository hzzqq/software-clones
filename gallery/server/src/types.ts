/** Gallery 领域类型（驼峰命名，与 SQLite 行（蛇形）解耦）。 */

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

/** 资源列表的筛选条件。 */
export interface AssetFilter {
  albumId?: number;
  tag?: string;
  from?: string;
  to?: string;
}
