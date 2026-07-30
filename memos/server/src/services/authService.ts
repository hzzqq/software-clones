import { createUser, getUserByEmail, getUserById, PublicUser } from '../repositories/userRepo';
import { createSession, getSession, deleteSession } from '../repositories/sessionRepo';
import { hashPassword, verifyPassword } from '../lib/password';
import { HttpError } from '../lib/httpError';

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export function toPublic(u: { id: number; email: string; display_name: string }): PublicUser {
  return { id: u.id, email: u.email, displayName: u.display_name };
}

export function register(input: {
  email: string;
  displayName: string;
  password: string;
}): AuthResult {
  const email = (input.email ?? '').trim().toLowerCase();
  const displayName = (input.displayName ?? '').trim();
  const password = input.password ?? '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 40010, '邮箱格式不正确');
  if (displayName.length < 1) throw new HttpError(400, 40011, '显示名称不能为空');
  if (password.length < 6) throw new HttpError(400, 40012, '密码至少 6 位');
  if (getUserByEmail(email)) throw new HttpError(409, 40900, '该邮箱已注册');
  const user = createUser(email, displayName, hashPassword(password));
  const token = createSession(user.id);
  return { token, user };
}

export function login(input: { email: string; password: string }): AuthResult {
  const email = (input.email ?? '').trim().toLowerCase();
  const password = input.password ?? '';
  const row = getUserByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new HttpError(401, 40100, '邮箱或密码错误');
  }
  const user = toPublic(row);
  const token = createSession(user.id);
  return { token, user };
}

export function logout(token: string): void {
  deleteSession(token);
}

export function userFromToken(token: string): PublicUser | null {
  const uid = getSession(token);
  if (uid === null) return null;
  return getUserById(uid);
}
