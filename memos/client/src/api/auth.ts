import { apiClient } from './client';
import { AuthUser } from '../authStore';

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (email: string, displayName: string, password: string) =>
    apiClient.post<AuthResult>('/auth/register', { email, displayName, password }),
  login: (email: string, password: string) =>
    apiClient.post<AuthResult>('/auth/login', { email, password }),
  me: () => apiClient.get<AuthUser>('/auth/me'),
  logout: () => apiClient.post<null>('/auth/logout'),
};
