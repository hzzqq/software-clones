import { apiClient } from './client';
import type { Message, Room } from '../types';

/** 房间列表（含消息数）。 */
export async function listRooms(): Promise<Room[]> {
  return apiClient.get<Room[]>('/rooms');
}

/** 创建房间。 */
export async function createRoom(name: string): Promise<Room> {
  return apiClient.post<Room>('/rooms', { name });
}

/** 获取房间历史消息（默认最近 50 条）。 */
export async function getMessages(roomId: number, limit = 50): Promise<Message[]> {
  return apiClient.get<Message[]>(
    `/rooms/${roomId}/messages?limit=${encodeURIComponent(String(limit))}`
  );
}

/** 发送消息。 */
export async function postMessage(
  roomId: number,
  nickname: string,
  content: string
): Promise<Message> {
  return apiClient.post<Message>(`/rooms/${roomId}/messages`, { nickname, content });
}

/** SSE 实时消息流地址（EventSource 使用）。 */
export function streamUrl(roomId: number): string {
  const base: string =
    import.meta.env.VITE_API_BASE ?? 'http://localhost:4220/api';
  return `${base}/rooms/${roomId}/stream`;
}
