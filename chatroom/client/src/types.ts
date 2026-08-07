/**
 * 聊天室应用的数据类型定义（与后端 REST 信封 data 字段一致）。
 */

/** 房间。 */
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

/** 统一响应信封。 */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}
