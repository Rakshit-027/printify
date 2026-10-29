export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

const RUST_BACKEND_URL = process.env.RUST_BACKEND_URL || 'http://127.0.0.1:8080';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const res = await fetch(`${RUST_BACKEND_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('Verify OTP proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect to backend server' },
      { status: 502 }
    );
  }
}
