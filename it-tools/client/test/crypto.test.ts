import { describe, it, expect } from 'vitest';
import {
  md5,
  sha1,
  sha256,
  sha512,
  sha3,
  allHashes,
  subtleSha256,
} from '../src/utils/crypto';

/**
 * Hash correctness is verified against well-known, published test vectors
 * (NIST FIPS 180 short-message vectors for 'abc' / '').
 */
describe('crypto hash helpers', () => {
  describe('md5', () => {
    it('hashes empty string', () => {
      expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });
    it('hashes "abc"', () => {
      expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
    });
  });

  describe('sha1', () => {
    it('hashes empty string', () => {
      expect(sha1('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    });
    it('hashes "abc"', () => {
      expect(sha1('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    });
  });

  describe('sha256', () => {
    it('hashes empty string', () => {
      expect(sha256('')).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
    });
    it('hashes "abc"', () => {
      expect(sha256('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
      );
    });
  });

  describe('sha512', () => {
    it('hashes empty string', () => {
      expect(sha512('')).toBe(
        'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce' +
          '47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
      );
    });
    it('hashes "abc"', () => {
      expect(sha512('abc')).toBe(
        'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a' +
          '2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
      );
    });
  });

  describe('sha3', () => {
    it('hashes "abc" (crypto-js SHA3 defaults to 512-bit output)', () => {
      expect(sha3('abc')).toBe(
        '18587dc2ea106b9a1563e32b3312421ca164c7f1f07bc922a9c83d77cea3a1e5d0c' +
          '69910739025372dc14ac9642629379540c17e2a65b19d77aa511a9d00bb96'
      );
    });
  });

  describe('allHashes', () => {
    it('returns all four common hashes', () => {
      const result = allHashes('abc');
      expect(result).toEqual({
        md5: md5('abc'),
        sha1: sha1('abc'),
        sha256: sha256('abc'),
        sha512: sha512('abc'),
      });
    });
  });

  describe('subtleSha256', () => {
    it('matches crypto-js sha256 for "abc"', async () => {
      expect(await subtleSha256('abc')).toBe(sha256('abc'));
    });
    it('is deterministic', async () => {
      expect(await subtleSha256('hello world')).toBe(await subtleSha256('hello world'));
    });
  });
});
