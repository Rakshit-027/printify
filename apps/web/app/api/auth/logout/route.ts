import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromRequest, logAuditEvent } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (session) {
    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      userId: session.userId,
      action: 'USER_LOGOUT',
      resource: 'User',
      resourceId: session.userId,
      ipAddress,
      details: { role: session.role },
    });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  clearSessionCookie(response);
  return response;
}
