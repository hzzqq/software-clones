/**
 * 鉴权助手：把常见的鉴权方式（Bearer / Basic / API Key）转换成请求头或查询参数，
 * 并提供「合并进现有多行文本」的纯函数，避免用户手写 Base64 与拼写错误。
 */

import { parseHeadersText, headersToText, parseKeyValueText } from './http';
import { encodeBasicCredentials } from './curl';

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

/** 鉴权配置。字段按 type 取用，其余忽略。 */
export interface AuthConfig {
  type: AuthType;
  /** Bearer：令牌本体（不含 "Bearer " 前缀）。 */
  token?: string;
  /** Basic：用户名 / 密码。 */
  username?: string;
  password?: string;
  /** API Key：键名与键值，以及放置位置。 */
  keyName?: string;
  keyValue?: string;
  addTo?: 'header' | 'query';
}

export const EMPTY_AUTH: AuthConfig = {
  type: 'none',
  token: '',
  username: '',
  password: '',
  keyName: 'X-API-Key',
  keyValue: '',
  addTo: 'header',
};

/**
 * 依据配置生成需要写入「请求头」的键值对。
 * - bearer：`Authorization: Bearer <token>`
 * - basic：`Authorization: Basic <base64(user:pass)>`（UTF-8 安全）
 * - apikey 且 addTo=header：`<keyName>: <keyValue>`
 * 配置不完整（如令牌为空）时返回空对象，不产生半成品头。
 */
export function buildAuthHeaders(cfg: AuthConfig): Record<string, string> {
  switch (cfg.type) {
    case 'bearer': {
      const token = (cfg.token ?? '').trim();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    case 'basic': {
      const user = cfg.username ?? '';
      const pass = cfg.password ?? '';
      if (!user && !pass) return {};
      return { Authorization: `Basic ${encodeBasicCredentials(user, pass)}` };
    }
    case 'apikey': {
      const name = (cfg.keyName ?? '').trim();
      const value = cfg.keyValue ?? '';
      if (!name || (cfg.addTo ?? 'header') !== 'header') return {};
      return { [name]: value };
    }
    default:
      return {};
  }
}

/** 依据配置生成需要写入「查询参数」的键值对（仅 apikey + addTo=query 时非空）。 */
export function buildAuthParams(cfg: AuthConfig): Record<string, string> {
  if (cfg.type !== 'apikey' || (cfg.addTo ?? 'header') !== 'query') return {};
  const name = (cfg.keyName ?? '').trim();
  if (!name) return {};
  return { [name]: cfg.keyValue ?? '' };
}

/** 鉴权配置是否可用（能产出至少一个头或参数）。 */
export function isAuthComplete(cfg: AuthConfig): boolean {
  return (
    Object.keys(buildAuthHeaders(cfg)).length > 0 || Object.keys(buildAuthParams(cfg)).length > 0
  );
}

/**
 * 把新的请求头合并进「Key: Value」多行文本。
 * 同名键（大小写不敏感）会被覆盖而不是重复追加；返回新文本，不修改入参。
 */
export function mergeHeadersText(text: string, add: Record<string, string>): string {
  const existing = parseHeadersText(text ?? '');
  const addLower = new Set(Object.keys(add).map((k) => k.toLowerCase()));
  const kept: Record<string, string> = {};
  for (const [k, v] of Object.entries(existing)) {
    if (!addLower.has(k.toLowerCase())) kept[k] = v;
  }
  return headersToText({ ...kept, ...add });
}

/**
 * 把新的查询参数合并进「key=value」多行文本。
 * 同名键（大小写敏感，与 URL 语义一致）覆盖；返回新文本，不修改入参。
 */
export function mergeParamsText(text: string, add: Record<string, string>): string {
  const merged = { ...parseKeyValueText(text ?? ''), ...add };
  return Object.entries(merged)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

/** 鉴权类型的中文标签，用于 UI 下拉与说明。 */
export const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  none: '不使用',
  bearer: 'Bearer Token',
  basic: 'Basic 用户名/密码',
  apikey: 'API Key',
};
