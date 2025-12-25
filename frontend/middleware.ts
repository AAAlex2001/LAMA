import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['ru', 'sr', 'en'];
const defaultLocale = 'ru';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Пропускаем статические файлы и API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
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
    return NextResponse.redirect(new URL(`/${defaultLocale}`, request.url));
  }

  // Для остальных путей без языка добавляем дефолтный
  return NextResponse.redirect(new URL(`/${defaultLocale}${pathname}`, request.url));
}

export const config = {
  matcher: ['/((?!_next|api|static|favicon.ico).*)'],
};
