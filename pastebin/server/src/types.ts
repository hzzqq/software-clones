export interface Paste {
  id: number;
  code: string;
  title: string;
  content: string;
  language: string;
  visibility: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface PasteInput {
  title?: string;
  content: string;
  language?: string;
  visibility?: string;
  /** 过期分钟数；不传则永不过期。 */
  expiresInMinutes?: number;
}
