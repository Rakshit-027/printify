import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { UserRole } from '@printflow/shared-types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'printflow-development-secret-key-at-least-32-chars-long!'
);
export const COOKIE_NAME = 'printflow_session';
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface AuthSessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  vendorId?: string; // If associated with a vendor
}

// -----------------------------------------------------------------
// PASSWORD HASHING
// -----------------------------------------------------------------
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

// -----------------------------------------------------------------
// JWT CREATION & VERIFICATION
// -----------------------------------------------------------------
export async function createSessionToken(payload: AuthSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSessionPayload;
  } catch (error) {
    return null;
  }
}

// -----------------------------------------------------------------
// COOKIE MANAGERS
// -----------------------------------------------------------------
export function setSessionCookie(response: NextResponse, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// -----------------------------------------------------------------
// SESSION RESOLVER FOR ROUTE HANDLERS & SERVER COMPONENTS
// -----------------------------------------------------------------
export async function getSession(): Promise<AuthSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const getSessionUser = getSession;

export async function getSessionFromRequest(request: NextRequest): Promise<AuthSessionPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    // Also check Bearer Authorization header (for API / Desktop agent)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return verifySessionToken(authHeader.substring(7));
    }
    return null;
  }
  return verifySessionToken(token);
}

// -----------------------------------------------------------------
// RBAC GUARDS
// -----------------------------------------------------------------
export function hasRole(session: AuthSessionPayload | null, allowedRoles: UserRole[]): boolean {
  if (!session) return false;
  if (session.role === UserRole.SUPER_ADMIN) return true; // Super admin possesses full cross-tenant authority
  return allowedRoles.includes(session.role);
}

export async function requireAuth(request: NextRequest): Promise<{ session: AuthSessionPayload } | NextResponse> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  return { session };
}

export async function requireRoles(
  request: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ session: AuthSessionPayload } | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { session } = authResult;
  if (!hasRole(session, allowedRoles)) {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }
  return { session };
}

// -----------------------------------------------------------------
// AUDIT LOGGING HELPER
// -----------------------------------------------------------------
export async function logAuditEvent(params: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined,
      },
    });
  } catch (err) {
    console.error('Audit log creation failed:', err);
  }
}
