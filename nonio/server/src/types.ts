// Non.io 社区论坛 —— 服务端类型定义（唯一真源）

export type ISODate = string;

export interface Channel {
  id: number;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Post {
  id: number;
  channelId: number;
  channelName: string;
  title: string;
  body: string;
  authorName: string;
  tags: string[];
  likes: number;
  commentCount: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  authorName: string;
  body: string;
  likes: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

// ---- 请求 DTO ----
export interface CreateChannelInput {
  name: string;
  description?: string;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
}

export interface CreatePostInput {
  channelId: number;
  title: string;
  body: string;
  authorName?: string;
  tags?: string[];
}

export interface UpdatePostInput {
  title?: string;
  body?: string;
  tags?: string[];
}

export interface CreateCommentInput {
  postId: number;
  parentId?: number | null;
  authorName?: string;
  body: string;
}
