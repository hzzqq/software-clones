/**
 * 密码条目的分类展示元信息：颜色与图标。
 */
import { CATEGORIES, DEFAULT_CATEGORY } from '../types';

export interface CategoryMeta {
  name: string;
  color: string;
  icon: string;
}

const CATEGORY_META_MAP: Record<string, CategoryMeta> = {
  其他: { name: '其他', color: '#64748b', icon: '🔐' },
  工作: { name: '工作', color: '#3b82f6', icon: '💼' },
  社交: { name: '社交', color: '#ec4899', icon: '💬' },
  金融: { name: '金融', color: '#f59e0b', icon: '💰' },
  购物: { name: '购物', color: '#10b981', icon: '🛒' },
  娱乐: { name: '娱乐', color: '#8b5cf6', icon: '🎮' },
  邮箱: { name: '邮箱', color: '#06b6d4', icon: '✉️' },
  开发: { name: '开发', color: '#22c55e', icon: '👨‍💻' },
};

export function getCategoryMeta(category: string): CategoryMeta {
  const key = category && CATEGORY_META_MAP[category] ? category : DEFAULT_CATEGORY;
  return CATEGORY_META_MAP[key];
}

export function categoryColor(category: string): string {
  return getCategoryMeta(category).color;
}

export function categoryIcon(category: string): string {
  return getCategoryMeta(category).icon;
}

/** 下拉选项使用的完整分类列表。 */
export function categoryOptions(): CategoryMeta[] {
  return CATEGORIES.map((name) => CATEGORY_META_MAP[name] ?? { name, color: '#64748b', icon: '🔐' });
}
