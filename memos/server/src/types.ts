export type Visibility = 'public' | 'protected' | 'private';

export interface Note {
  id: number;
  content: string;
  visibility: Visibility;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Tag {
  id: number;
  name: string;
  count: number;
}
