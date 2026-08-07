import { useEffect, useState } from 'react';

/**
 * 返回防抖后的值：输入变化后延迟 `delayMs` 毫秒才更新，
 * 用于搜索框等高频输入场景，减少请求次数。
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
