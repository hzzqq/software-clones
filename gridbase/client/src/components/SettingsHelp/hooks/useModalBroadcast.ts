/**
 * 弹窗开启状态广播（带引用计数）。
 *
 * 多个 Dialog 可能同时存在，因此计数器必须在模块作用域共享；
 * 只有 0→1 才打标记并广播 open:true，只有归零才清标记并广播 open:false。
 *
 * 各 Dialog 不要自行派发事件，统一用 useModalPresence(open, source)。
 */
import { useCallback, useEffect } from 'react';
import { APP_EVENTS, BODY_FLAGS } from '../constants';

/** 模块级共享引用计数（跨组件实例共享，故不能放在组件内 useRef）。 */
const openCountRef: { current: number } = { current: 0 };

/** 广播弹窗开合事件。 */
function dispatchModalEvent(open: boolean, source: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent(APP_EVENTS.MODAL, { detail: { open, source } }));
  } catch (error) {
    console.warn('[settings-help] 广播弹窗状态失败', error);
  }
}

/** useModalBroadcast 的返回结构。 */
export interface UseModalBroadcastResult {
  /** 通知有弹窗打开。 */
  notifyOpen: (source: string) => void;
  /** 通知某个弹窗关闭。 */
  notifyClose: (source: string) => void;
}

/** 获取弹窗开合的广播函数。 */
export function useModalBroadcast(): UseModalBroadcastResult {
  const notifyOpen = useCallback((source: string): void => {
    openCountRef.current += 1;
    if (openCountRef.current === 1) {
      if (typeof document !== 'undefined') {
        document.body.dataset[BODY_FLAGS.MODAL_OPEN] = '1';
      }
      dispatchModalEvent(true, source);
    }
  }, []);

  const notifyClose = useCallback((source: string): void => {
    openCountRef.current = Math.max(0, openCountRef.current - 1);
    if (openCountRef.current === 0) {
      if (typeof document !== 'undefined') {
        delete document.body.dataset[BODY_FLAGS.MODAL_OPEN];
      }
      dispatchModalEvent(false, source);
    }
  }, []);

  return { notifyOpen, notifyClose };
}

/**
 * 声明式地把某个 Dialog 的 open 状态接入全局计数。
 * 通过 effect 的 cleanup 做减计数，天然对 StrictMode 的双调用保持平衡。
 */
export function useModalPresence(open: boolean, source: string): void {
  const { notifyOpen, notifyClose } = useModalBroadcast();
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    notifyOpen(source);
    return () => {
      notifyClose(source);
    };
  }, [open, source, notifyOpen, notifyClose]);
}
