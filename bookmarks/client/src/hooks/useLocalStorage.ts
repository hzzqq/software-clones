import { useState } from 'react';

/**
 * 读写 localStorage 的轻量钩子，JSON 序列化 + 异常兜底。
 * 用于持久化「列表 / 网格」视图偏好等 UI 状态。
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T): void => {
    setStored(value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 忽略：隐私模式等场景下写入失败不影响使用 */
    }
  };

  return [stored, setValue];
}
