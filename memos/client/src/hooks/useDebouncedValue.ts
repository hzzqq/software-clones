import { useEffect, useState } from 'react';

/**
 * 防抖值：输入停止 `delay` 毫秒后才更新返回值。
 *
 * 搜索框每敲一个字符就打一次接口，既浪费请求也会让列表在输入过程中不停闪烁；
 * 用它把「正在输入的值」和「真正触发检索的值」分开。
 * delay <= 0 时退化为同步返回，便于测试与特殊场景。
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useDebouncedValue;
