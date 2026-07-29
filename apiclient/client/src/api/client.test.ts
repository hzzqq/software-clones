import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiClient } from './client';
import { ApiError } from './client';

function mockFetch(impl: (url: string, opts: any) => Promise<Response> | Response) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiClient', () => {
  it('解析成功信封并返回 data 字段', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ code: 0, message: 'ok', data: { id: 7 } }), {
        status: 200,
      })
    );
    await expect(apiClient.get('/things')).resolves.toEqual({ id: 7 });
  });

  it('后端非零业务码时抛出的 ApiError 携带 code/message', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ code: 4001, message: '参数错误', data: null }), {
        status: 200,
      })
    );
    try {
      await apiClient.post('/things', { a: 1 });
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe(4001);
      expect((e as ApiError).message).toBe('参数错误');
    }
  });

  it('网络层失败（断网/CORS/宕机）统一为 50001', async () => {
    mockFetch(async () => {
      throw new Error('Failed to fetch');
    });
    await expect(apiClient.get('/things')).rejects.toMatchObject({ code: 50001 });
  });

  it('调用方取消 / 超时中断归类为 50002（而非 50001）', async () => {
    const ctrl = new AbortController();
    mockFetch(async (_url) => {
      // 模拟本次请求因 signal 中断而失败
      ctrl.abort();
      throw new DOMException('The operation was aborted', 'AbortError');
    });
    await expect(apiClient.get('/things', { signal: ctrl.signal })).rejects.toMatchObject({
      code: 50002,
    });
  });

  it('超过 DEFAULT_TIMEOUT_MS 仍无响应时自动中断并抛 50002', async () => {
    vi.useFakeTimers();
    // 永不 settle 的 fetch；真实超时后 controller.abort() 会触发其 signal 的 abort 事件
    mockFetch((_url, opts) => {
      return new Promise<Response>((_resolve, reject) => {
        opts.signal.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted', 'AbortError'))
        );
      });
    });
    const p = apiClient.get('/slow');
    // 先挂好断言处理器，再推进假时钟，避免 reject 早于 handler 触发「unhandledRejection」
    const assertion = expect(p).rejects.toMatchObject({ code: 50002 });
    await vi.advanceTimersByTimeAsync(30000);
    await assertion;
  });
});
