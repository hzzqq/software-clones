export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
}

const TOKEN_KEY = 'memos_token';
const USER_KEY = 'memos_user';

/** 轻量前端会话存储：token + 当前用户，统一从这里读写。 */
export const authStore = {
  getToken: (): string | null =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  setSession: (token: string, user: AuthUser): void => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: (): AuthUser | null => {
    try {
      const s = localStorage.getItem(USER_KEY);
      return s ? (JSON.parse(s) as AuthUser) : null;
    } catch {
      return null;
    }
  },
};
