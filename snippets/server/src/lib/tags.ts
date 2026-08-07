/**
 * 标签解析工具：把「自由文本或数组」解析成小写去重的标签列表。
 * 支持逗号（中英文）、空白分隔。
 */
export function parseTags(raw: unknown): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  const list: unknown[] = Array.isArray(raw) ? raw : [raw];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') {
      continue;
    }
    for (const part of item.split(/[,，\s]+/)) {
      const tag = part.trim().toLowerCase();
      if (tag && !out.includes(tag)) {
        out.push(tag);
      }
    }
  }
  return out;
}

/** 标签数量上限，防止异常输入撑爆关联表。 */
export const MAX_TAGS_PER_SNIPPET = 20;

/** 裁剪标签到上限。 */
export function limitTags(tags: string[]): string[] {
  return tags.slice(0, MAX_TAGS_PER_SNIPPET);
}
