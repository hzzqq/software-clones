// Non.io 社区论坛 —— 前端类型（与服务端保持一致）
export interface Channel {
  id: number;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  authorName: string;
  body: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

// 前端用于展示的评论树结点
export interface CommentNode extends Comment {
  children: CommentNode[];
}
