import { useEffect, useState } from 'react';

/**
 * 防抖 Hook：在 `value` 停止变化 `delay` 毫秒后才更新返回值。
 * 常用于搜索框输入，避免每次按键都触发请求 / 过滤。
 *
 * @template T 值的类型
 * @param value 原始输入值
 * @param delay 防抖延迟（毫秒）
 * @returns 防抖后的稳定值
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    // 值或延迟变化前清理上一个定时器，避免重复触发。
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebouncedValue;
