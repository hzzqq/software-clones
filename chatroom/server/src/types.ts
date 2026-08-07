/**
 * 聊天室服务端数据类型定义。
 */

/** 房间（含消息数，列表展示用）。 */
export interface Room {
  id: number;
  name: string;
  createdAt: string;
  messageCount: number;
}

/** 消息。 */
export interface Message {
  id: number;
  roomId: number;
  nickname: string;
  content: string;
  createdAt: string;
}
