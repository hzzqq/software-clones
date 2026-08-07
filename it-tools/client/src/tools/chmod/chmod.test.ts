import { describe, it, expect } from 'vitest';
import {
  permissionsToSymbolic,
  symbolicToPermissions,
  parseChmod,
  describeChmod,
  isValidSymbolic,
} from './chmod';

describe('chmod', () => {
  it('数字 → 符号', () => {
    expect(permissionsToSymbolic(0o755)).toBe('rwxr-xr-x');
    expect(permissionsToSymbolic(0o644)).toBe('rw-r--r--');
    expect(permissionsToSymbolic(0o000)).toBe('---------');
  });

  it('符号 → 数字', () => {
    expect(symbolicToPermissions('rwxr-xr-x')).toBe(0o755);
    expect(symbolicToPermissions('rw-r--r--')).toBe(0o644);
  });

  it('非法符号返回 null', () => {
    expect(symbolicToPermissions('rwxr-x')).toBeNull();
    expect(symbolicToPermissions('rwxr-xr-xr')).toBeNull();
  });

  it('parseChmod 兼容数字与符号', () => {
    expect(parseChmod('755')).toBe(0o755);
    expect(parseChmod('rwxr-xr-x')).toBe(0o755);
    expect(parseChmod('abc')).toBeNull();
  });

  it('describeChmod 逐类别布尔权限', () => {
    const [owner, group, other] = describeChmod(0o755);
    expect(owner).toMatchObject({ cls: 'owner', value: 7, read: true, write: true, execute: true });
    expect(group).toMatchObject({ cls: 'group', value: 5, read: true, write: false, execute: true });
    expect(other).toMatchObject({ cls: 'other', value: 5, read: true, write: false, execute: true });
  });

  it('isValidSymbolic', () => {
    expect(isValidSymbolic('rwxr-xr-x')).toBe(true);
    expect(isValidSymbolic('bad')).toBe(false);
  });

  it('permissionsToSymbolic 拒绝越界', () => {
    expect(() => permissionsToSymbolic(0o7777)).toThrow();
  });
});
