import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { User } from './storage';

// L1 T2 decision: server-side sessions in an HttpOnly cookie, passwords hashed with scrypt from node:crypto.
export const SESSION_COOKIE = 'nexus_session';
const SESSION_MS = 8 * 60 * 60 * 1000;

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

// An unknown user is checked against a throwaway hash, so a wrong email takes as long as a wrong password.
const nobody = hashPassword(randomBytes(16).toString('hex'));
export function verifyPassword(password: string, stored: string | undefined) {
  const [, salt = '', hash = ''] = (stored ?? nobody).split('$');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), 64);
  const expected = Buffer.from(hash, 'hex');
  return stored !== undefined && expected.length === actual.length && timingSafeEqual(actual, expected);
}

// Sessions live in memory: a restart signs everyone out.
const sessions = new Map<string, { userId: string; workspaceId: string; expires: number }>();

export function createSession(user: User) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { userId: user.id, workspaceId: user.workspaceId, expires: Date.now() + SESSION_MS });
  return token;
}

export function readSession(cookieHeader: string | undefined) {
  const token = cookieHeader?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  const session = token ? sessions.get(token) : undefined;
  if (!token || !session) return undefined;
  if (session.expires < Date.now()) {
    sessions.delete(token);
    return undefined;
  }
  return { token, session };
}

export const endSession = (token: string) => sessions.delete(token);

export const sessionCookie = (token: string, maxAgeMs = SESSION_MS) =>
  `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

// First boot: NEXUS_ADMIN_PASSWORD becomes the password of the first org admin, only while no org admin has one.
export function bootstrapAdmin(users: User[], password: string | undefined) {
  if (!password || users.some((u) => u.role === 'org_admin' && u.passwordHash)) return undefined;
  const admin = users.find((u) => u.role === 'org_admin');
  if (admin) admin.passwordHash = hashPassword(password);
  return admin;
}

export const publicUser = ({ passwordHash, ...user }: User) => user;
