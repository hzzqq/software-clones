/**
 * Vault 的数据模型与常量。
 */

/** 密码条目的类别（预置集合，服务端以自由文本存储，展示时按此映射颜色）。 */
export const CATEGORIES: string[] = [
  '其他',
  '工作',
  '社交',
  '金融',
  '购物',
  '娱乐',
  '邮箱',
  '开发',
] as const;

export const DEFAULT_CATEGORY: string = '其他';

/** 密码保险库条目（password 为服务端解密后的明文，仅存在于内存与响应中）。 */
export interface VaultEntry {
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

/** 新建 / 编辑条目时的表单载荷。 */
export interface VaultEntryInput {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  category: string;
}

/** 列表筛选条件。 */
export interface VaultFilter {
  q: string;
  category: string;
}

export function emptyEntryInput(): VaultEntryInput {
  return {
    title: '',
    username: '',
    password: '',
    url: '',
    notes: '',
    category: DEFAULT_CATEGORY,
  };
}
