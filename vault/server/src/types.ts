/**
 * Vault 服务端类型。
 */

/** 密码条目（对外形态：password 为解密后的明文）。 */
export interface Entry {
  id: number;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

/** 新建 / 更新条目的输入。 */
export interface EntryInput {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  category: string;
}

/** 列表筛选。 */
export interface EntryFilter {
  q: string;
  category: string;
}

/** 数据库行（snake_case）。 */
export interface EntryRow {
  id: number;
  title: string;
  username: string;
  password_enc: string;
  url: string;
  notes: string;
  category: string;
  created_at: string;
  updated_at: string;
}
