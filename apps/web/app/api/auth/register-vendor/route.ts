export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

const RUST_BACKEND_URL = process.env.RUST_BACKEND_URL || 'http://127.0.0.1:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    if (clientIp) headers['x-forwarded-for'] = clientIp;

    const userAgent = request.headers.get('user-agent');
    if (userAgent) headers['user-agent'] = userAgent;

    const res = await fetch(`${RUST_BACKEND_URL}/api/auth/register-vendor`, {
      method: 'POST',
      headers,
      body,
    });

    const data = await res.json().catch(() => ({}));
    const response = NextResponse.json(data, { status: res.status });

    // Forward Set-Cookie header (JWT session) from Rust backend
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }

    return response;
  } catch (error: any) {
    console.error('Registration proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect to backend server' },
      { status: 502 }
    );
  }
}
