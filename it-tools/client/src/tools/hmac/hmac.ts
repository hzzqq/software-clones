import CryptoJS from 'crypto-js';

/**
 * HMAC 生成器（基于 crypto-js，浏览器原生可用，无需新依赖）。
 * 支持 MD5 / SHA-1 / SHA-256 / SHA-512，输出 hex 或 Base64。
 * 纯函数、无副作用、可单测。
 */

/** 支持的 HMAC 算法。 */
export const HMAC_ALGOS = ['MD5', 'SHA1', 'SHA256', 'SHA512'] as const;
export type HmacAlgo = (typeof HMAC_ALGOS)[number];

/** 支持的输出编码。 */
export const HMAC_FORMATS = ['hex', 'base64'] as const;
export type HmacFormat = (typeof HMAC_FORMATS)[number];

function hmacWordArray(algo: HmacAlgo, message: string, secret: string): CryptoJS.lib.WordArray {
  const fn = (CryptoJS as unknown as Record<string, (m: string, s: string) => CryptoJS.lib.WordArray>)[
    `Hmac${algo}`
  ];
  if (typeof fn !== 'function') {
    throw new Error(`不支持的 HMAC 算法：${algo}`);
  }
  return fn(message, secret);
}

/** 计算 HMAC，按指定格式（hex / base64）输出。 */
export function hmac(
  algo: HmacAlgo,
  message: string,
  secret: string,
  format: HmacFormat = 'hex',
): string {
  const wa = hmacWordArray(algo, message, secret);
  if (format === 'base64') {
    return wa.toString(CryptoJS.enc.Base64);
  }
  return wa.toString(CryptoJS.enc.Hex);
}

/** 校验算法名是否合法。 */
export function isHmacAlgo(value: string): value is HmacAlgo {
  return (HMAC_ALGOS as readonly string[]).includes(value);
}

/** 校验输出格式是否合法。 */
export function isHmacFormat(value: string): value is HmacFormat {
  return (HMAC_FORMATS as readonly string[]).includes(value);
}
