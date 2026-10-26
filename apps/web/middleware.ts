import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'printflow-development-secret-key-at-least-32-chars-long!'
);
const COOKIE_NAME = 'printflow_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let sessionPayload: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionPayload = payload;
    } catch {
      sessionPayload = null;
    }
  }

  // 1. Admin route protection - Require SUPER_ADMIN or ADMIN
  if (pathname.startsWith('/admin')) {
    if (!sessionPayload) {
      if (process.env.NODE_ENV !== 'production') {
        // Auto-seed dev admin session so local testing is never blocked
        const devToken = await new SignJWT({
          userId: 'admin-super-id',
          email: 'admin@print2me.in',
          fullName: 'Super Administrator',
          role: 'SUPER_ADMIN',
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('7d')
          .sign(JWT_SECRET);

        const response = NextResponse.next();
        response.cookies.set({
          name: COOKIE_NAME,
          value: devToken,
          httpOnly: true,
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
          sameSite: 'lax',
        });
        return response;
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = (sessionPayload.role || '').toUpperCase();
    if (role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/vendor', request.url));
    }
    return NextResponse.next();
  }

  // 2. Vendor route protection - Require valid authenticated session
  if (pathname.startsWith('/vendor')) {
    if (!sessionPayload) {
      if (process.env.NODE_ENV !== 'production') {
        // Auto-seed dev vendor session so local testing is never blocked
        const devToken = await new SignJWT({
          userId: '38cf1c64-a681-46b5-8068-d845fd096e09',
          email: 'rakshitwaghmare27@gmail.com',
          fullName: 'Rakshit Prints Admin',
          role: 'VENDOR_OWNER',
          vendorId: '60d47654-7089-48cb-8bab-45e2504ab6ca',
        })
          .setProtectedHeader({ alg: 'HS256' })
          .setIssuedAt()
          .setExpirationTime('7d')
          .sign(JWT_SECRET);

        const response = NextResponse.next();
        response.cookies.set({
          name: COOKIE_NAME,
          value: devToken,
          httpOnly: true,
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
          sameSite: 'lax',
        });
        return response;
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. Login / Register redirects if already logged in
  if (pathname === '/login' || pathname === '/register') {
    if (sessionPayload) {
      const role = (sessionPayload.role || '').toUpperCase();
      if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/vendor', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/vendor/:path*', '/login', '/register'],
};
