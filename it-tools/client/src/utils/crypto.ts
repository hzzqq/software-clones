import CryptoJS from 'crypto-js';

/**
 * Cryptographic helper utilities. MD5/SHA-1/SHA-256/SHA-512 are computed
 * with `crypto-js` (synchronous, browser-friendly). A `subtle`-based SHA-256
 * variant is provided for callers that prefer the Web Crypto API.
 */

export function md5(text: string): string {
  return CryptoJS.MD5(text).toString();
}

export function sha1(text: string): string {
  return CryptoJS.SHA1(text).toString();
}

export function sha256(text: string): string {
  return CryptoJS.SHA256(text).toString();
}

export function sha512(text: string): string {
  return CryptoJS.SHA512(text).toString();
}

export function sha3(text: string): string {
  return CryptoJS.SHA3(text).toString();
}

/** Compute all common hashes for a piece of text. */
export function allHashes(text: string): Record<string, string> {
  return {
    md5: md5(text),
    sha1: sha1(text),
    sha256: sha256(text),
    sha512: sha512(text),
  };
}

/** Web Crypto SHA-256 (hex). Falls back to crypto-js when unavailable. */
export async function subtleSha256(text: string): Promise<string> {
  try {
    // Annotate as Uint8Array<ArrayBuffer> so it satisfies BufferSource under
    // TS 5.7's stricter (SharedArrayBuffer-aware) DOM lib types.
    const data: Uint8Array<ArrayBuffer> = new TextEncoder().encode(text);
    const digest: ArrayBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return sha256(text);
  }
}
