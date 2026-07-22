// Photopea 克隆 —— 后端类型

export interface Design {
  id: number;
  name: string;
  thumbnail: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDesignInput {
  name?: string;
  thumbnail?: string;
  data: string;
}

export interface UpdateDesignInput {
  name?: string;
  thumbnail?: string;
  data?: string;
}
