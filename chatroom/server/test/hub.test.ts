import { describe, it, expect, beforeEach } from 'vitest';
import type { Response } from 'express';
import { addClient, removeClient, broadcast, clientCount, clearClients } from '../src/lib/hub';

/** 伪造一个可写 Response，用于隔离测试广播逻辑。 */
function fakeResponse(): { res: Response; chunks: string[] } {
  const chunks: string[] = [];
  const res = {
    write: (chunk: string): boolean => {
      chunks.push(String(chunk));
      return true;
    },
  } as unknown as Response;
  return { res, chunks };
}

beforeEach(() => {
  clearClients();
});

describe('hub broadcast', () => {
  it('delivers an SSE data frame to subscribed clients', () => {
    const { res, chunks } = fakeResponse();
    addClient(1, res);
    const delivered = broadcast(1, { type: 'message', message: { id: 7 } });
    expect(delivered).toBe(1);
    expect(chunks[0]).toBe('data: {"type":"message","message":{"id":7}}\n\n');
  });

  it('does not deliver to other rooms', () => {
    const { res, chunks } = fakeResponse();
    addClient(1, res);
    broadcast(2, { type: 'message' });
    expect(chunks).toHaveLength(0);
  });

  it('stops delivering after client removal', () => {
    const { res, chunks } = fakeResponse();
    addClient(1, res);
    removeClient(1, res);
    broadcast(1, { type: 'message' });
    expect(chunks).toHaveLength(0);
    expect(clientCount(1)).toBe(0);
  });

  it('returns zero when no clients are subscribed', () => {
    expect(broadcast(99, { type: 'message' })).toBe(0);
  });
});
