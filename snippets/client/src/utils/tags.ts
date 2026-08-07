/**
 * 标签解析工具（与 server/src/lib/tags.ts 同构，供表单输入即时预览）。
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

/** 标签输入框文本 → 标签数组；数组 → 逗号分隔文本。 */
export function tagsToText(tags: string[]): string {
  return tags.join(', ');
}

export function textToTags(text: string): string[] {
  return parseTags(text);
}
