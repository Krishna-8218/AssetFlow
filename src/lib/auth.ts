import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'assetflow-super-secret-key-change-in-production-2024'
);

const COOKIE_NAME = 'assetflow-token';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string | null;
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(payload: JWTPayload): Promise<string> {
  const token = await createToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return token;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function isAdmin(role: string): boolean {
  return role === 'ADMIN';
}

export function isAssetManager(role: string): boolean {
  return role === 'ASSET_MANAGER';
}

export function isDepartmentHead(role: string): boolean {
  return role === 'DEPARTMENT_HEAD';
}

export function isEmployee(role: string): boolean {
  return role === 'EMPLOYEE';
}

export function canManageOrganization(role: string): boolean {
  return role === 'ADMIN';
}

export function canManageAssets(role: string): boolean {
  return role === 'ADMIN' || role === 'ASSET_MANAGER';
}

export function canApproveTransfers(role: string): boolean {
  return role === 'ADMIN' || role === 'ASSET_MANAGER' || role === 'DEPARTMENT_HEAD';
}

export function canApproveMaintenance(role: string): boolean {
  return role === 'ADMIN' || role === 'ASSET_MANAGER';
}

export function canManageAudits(role: string): boolean {
  return role === 'ADMIN' || role === 'ASSET_MANAGER';
}

export function canViewReports(role: string): boolean {
  return role === 'ADMIN' || role === 'ASSET_MANAGER' || role === 'DEPARTMENT_HEAD';
}
