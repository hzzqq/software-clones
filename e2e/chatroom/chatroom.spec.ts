/**
 * chatroom E2E 冒烟：应用挂载 + 后端健康；房间创建/列表与消息发送/历史
 * （HTTP 层）的端到端。实时推送是 SSE（/api/rooms/:id/stream），不在
 * Playwright 里做流式握手，消息持久化通过 HTTP 端点断言。
 */
import { test, request, expect } from '@playwright/test';
import { expectAppMounted, expectServerHealthy } from '../helpers';
import { findApp } from '../apps.config';

const APP = findApp('chatroom');
const API = `http://localhost:${APP.serverPort}/api`;

/** 信封内的房间（含消息数统计）。 */
interface RoomDto {
  id: number;
  name: string;
  createdAt: string;
  messageCount: number;
}

/** 信封内的消息。 */
interface MessageDto {
  id: number;
  roomId: number;
  nickname: string;
  content: string;
  createdAt: string;
}

test('chatroom 挂载且后端健康', async ({ page }) => {
  await page.goto('/');
  await expectAppMounted(page);
  const ctx = await request.newContext();
  await expectServerHealthy(ctx, APP.serverPort);
  await ctx.dispose();
});

test('chatroom 房间创建与列表', async ({ request }) => {
  const name = `e2e_room_${Date.now()}`;

  // 1) 创建房间 → 201 + 完整 Room 信封
  const create = await request.post(`${API}/rooms`, { data: { name } });
  expect(create.status()).toBe(201);
  const room = (await create.json()).data as RoomDto;
  expect(room.id).toBeGreaterThan(0);
  expect(room.name).toBe(name);
  expect(room.messageCount).toBe(0);

  // 2) 房间列表确认持久化
  const list = await request.get(`${API}/rooms`);
  expect(list.status()).toBe(200);
  const rooms = (await list.json()).data as RoomDto[];
  expect(rooms.some((r) => r.id === room.id)).toBe(true);

  // 3) 空白名称 → 400
  const invalid = await request.post(`${API}/rooms`, { data: { name: '   ' } });
  expect(invalid.status()).toBe(400);
  expect(((await invalid.json()) as { code: number }).code).toBe(40001);
});

test('chatroom 消息发送与历史（HTTP 端点）', async ({ request }) => {
  // 0) 先建一个房间
  const roomRes = await request.post(`${API}/rooms`, {
    data: { name: `e2e_msg_room_${Date.now()}` },
  });
  expect(roomRes.status()).toBe(201);
  const room = (await roomRes.json()).data as RoomDto;

  // 1) 发送两条消息 → 201 + Message 信封（含 roomId 回填）
  const c1 = `e2e_first_${Date.now()}`;
  const send1 = await request.post(`${API}/rooms/${room.id}/messages`, {
    data: { nickname: 'e2e_bot', content: c1 },
  });
  expect(send1.status()).toBe(201);
  const msg1 = (await send1.json()).data as MessageDto;
  expect(msg1.roomId).toBe(room.id);
  expect(msg1.nickname).toBe('e2e_bot');
  expect(msg1.content).toBe(c1);

  const c2 = `e2e_second_${Date.now()}`;
  const send2 = await request.post(`${API}/rooms/${room.id}/messages`, {
    data: { nickname: 'e2e_bot', content: c2 },
  });
  expect(send2.status()).toBe(201);
  const msg2 = (await send2.json()).data as MessageDto;
  expect(msg2.content).toBe(c2);

  // 2) 历史接口确认两条都已持久化
  const historyRes = await request.get(`${API}/rooms/${room.id}/messages`);
  expect(historyRes.status()).toBe(200);
  const history = (await historyRes.json()).data as MessageDto[];
  expect(history.some((m) => m.id === msg1.id)).toBe(true);
  expect(history.some((m) => m.id === msg2.id)).toBe(true);

  // 3) limit=1 只返回最新一条
  const limitedRes = await request.get(`${API}/rooms/${room.id}/messages?limit=1`);
  expect(limitedRes.status()).toBe(200);
  const limited = (await limitedRes.json()).data as MessageDto[];
  expect(limited).toHaveLength(1);
  expect(limited[0].id).toBe(msg2.id);

  // 4) 负路径：空昵称 400；不存在的房间读写消息均 404
  const badNick = await request.post(`${API}/rooms/${room.id}/messages`, {
    data: { nickname: '   ', content: 'x' },
  });
  expect(badNick.status()).toBe(400);
  const missingHistory = await request.get(`${API}/rooms/99999999/messages`);
  expect(missingHistory.status()).toBe(404);
  const missingSend = await request.post(`${API}/rooms/99999999/messages`, {
    data: { nickname: 'e2e_bot', content: 'x' },
  });
  expect(missingSend.status()).toBe(404);
});
