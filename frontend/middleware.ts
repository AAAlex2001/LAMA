import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['ru', 'sr', 'en'];
const defaultLocale = 'ru';

function isAdminPath(pathname: string): boolean {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  return locales.some(
    (locale) => pathname === `/${locale}/admin` || pathname.startsWith(`/${locale}/admin/`)
  );
}

function unauthorized(): NextResponse {
  return new NextResponse('Admin authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin"',
    },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Защита админки через Basic Auth (логин/пароль из .env)
  if (isAdminPath(pathname)) {
    const adminLogin = process.env.ADMIN_LOGIN;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminLogin || !adminPassword) {
      return new NextResponse('ADMIN_LOGIN/ADMIN_PASSWORD are not configured', { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Basic ')) {
      return unauthorized();
    }

    try {
      const base64 = authHeader.slice('Basic '.length);
      const decoded = atob(base64);
      const separatorIndex = decoded.indexOf(':');
      const login = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : decoded;
      const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';

      if (login !== adminLogin || password !== adminPassword) {
        return unauthorized();
      }
    } catch {
      return unauthorized();
    }

    return NextResponse.next();
  }

  // Пропускаем статические файлы и API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Проверяем, есть ли язык в URL
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Редирект на дефолтный язык
  if (pathname === '/') {
    const url = new URL(`/${defaultLocale}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // Для остальных путей без языка добавляем дефолтный
  const url = new URL(`/${defaultLocale}${pathname}`, request.url);
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next|api|static|favicon.ico).*)'],
};
