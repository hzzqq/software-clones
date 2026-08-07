/**
 * 全屏切换钩子。
 *
 * 关键约束：
 *  - requestFullscreen 可能因浏览器策略 / iframe 沙箱被拒绝，全程 try/catch，
 *    失败时 resolve(false) 并给出 notice 文案（由 Provider 用 Snackbar 呈现），
 *    **绝不抛错**，以免触发全局 error 兜底红条；
 *  - 进出全屏后补发 window resize，供 react-grid-layout 等重新测量布局。
 */
import { useCallback, useEffect, useState } from 'react';
import { APP_EVENTS, BODY_FLAGS, RESIZE_BROADCAST_DELAYS } from '../constants';

/** 带 webkit 前缀的 Document 扩展。 */
interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

/** 带 webkit 前缀的元素扩展。 */
interface FullscreenCapableElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

/** 不支持全屏时展示的提示文案。 */
const UNSUPPORTED_NOTICE = '当前环境不支持全屏';

/** 读取当前是否处于全屏（兼容 webkit 前缀）。 */
function readFullscreenState(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null);
}

/** 连续补发若干次 resize 事件，确保依赖尺寸的组件完成重排。 */
function broadcastResize(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const fire = (): void => {
    try {
      window.dispatchEvent(new Event('resize'));
    } catch (error) {
      console.warn('[settings-help] 广播 resize 失败', error);
    }
  };
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(fire);
  }
  RESIZE_BROADCAST_DELAYS.forEach((delay) => {
    window.setTimeout(fire, delay);
  });
}

/** useFullscreen 的返回结构。 */
export interface UseFullscreenResult {
  /** 当前是否处于全屏。 */
  isFullscreen: boolean;
  /** 切换全屏；返回切换后的期望状态，失败时返回 false。 */
  toggle: () => Promise<boolean>;
  /** 需要提示给用户的文案，空串表示无提示。 */
  notice: string;
  /** 清除提示文案。 */
  clearNotice: () => void;
}

/** 管理全屏状态与副作用广播。 */
export function useFullscreen(): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => readFullscreenState());
  const [notice, setNotice] = useState<string>('');

  const clearNotice = useCallback((): void => {
    setNotice('');
  }, []);

  // 同步浏览器原生全屏状态（用户按 Esc / F11 时也要跟上）。
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const onChange = (): void => {
      const active: boolean = readFullscreenState();
      setIsFullscreen(active);
      if (active) {
        document.body.dataset[BODY_FLAGS.FULLSCREEN] = '1';
      } else {
        delete document.body.dataset[BODY_FLAGS.FULLSCREEN];
      }
      try {
        window.dispatchEvent(
          new CustomEvent(APP_EVENTS.FULLSCREEN_CHANGE, { detail: { fullscreen: active } })
        );
      } catch (error) {
        console.warn('[settings-help] 广播全屏变更失败', error);
      }
      broadcastResize();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggle = useCallback(async (): Promise<boolean> => {
    if (typeof document === 'undefined') {
      return false;
    }
    const doc = document as FullscreenDocument;
    const root = document.documentElement as FullscreenCapableElement;
    const active: boolean = readFullscreenState();
    try {
      if (active) {
        const exit = doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc);
        if (!exit) {
          setNotice(UNSUPPORTED_NOTICE);
          return false;
        }
        await exit();
        return false;
      }
      const request =
        root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
      if (!request) {
        setNotice(UNSUPPORTED_NOTICE);
        return false;
      }
      await request();
      return true;
    } catch (error) {
      // 浏览器拒绝（无用户手势 / iframe 未授权 allow="fullscreen"）等情况。
      console.warn('[settings-help] 切换全屏失败', error);
      setNotice(UNSUPPORTED_NOTICE);
      return false;
    }
  }, []);

  return { isFullscreen, toggle, notice, clearNotice };
}
