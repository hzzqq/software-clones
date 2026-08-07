/**
 * 昵称本地存储工具（含单测，见 nickname.test.ts）。
 */

const NICKNAME_KEY = 'chatroom-nickname';
const MAX_LEN = 24;
const GUEST_PREFIX = '游客';

/** 从 localStorage 读取昵称；无则返回空串。 */
export function loadNickname(): string {
  try {
    const value = localStorage.getItem(NICKNAME_KEY);
    return value ? sanitizeNickname(value) : '';
  } catch {
    return '';
  }
}

/** 保存昵称到 localStorage（非法输入会被清洗）。 */
export function saveNickname(nickname: string): void {
  const clean = sanitizeNickname(nickname);
  try {
    if (clean) {
      localStorage.setItem(NICKNAME_KEY, clean);
    } else {
      localStorage.removeItem(NICKNAME_KEY);
    }
  } catch {
    /* 隐私模式等场景忽略 */
  }
}

/** 清洗昵称：去首尾空白、压缩连续空白、截断长度；空值返回空串。 */
export function sanitizeNickname(raw: string): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LEN);
}

/** 生成随机游客昵称，如 "游客4821"。 */
export function randomGuestName(): string {
  return `${GUEST_PREFIX}${Math.floor(1000 + Math.random() * 9000)}`;
}
