'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Хук для автоматического сохранения токена из URL в localStorage
 * Используется когда бот перенаправляет пользователя с токеном в query params
 */
export function useTokenFromUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isJwtLike = (value: string) => {
    // JWT typically looks like: header.payload.signature (3 dot-separated base64url segments)
    // Share tokens we generate are urlsafe strings without dots.
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  };

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    
    // Important: we also use `token` query param for shared drafts.
    // Only treat it as an auth access token if it looks like a JWT.
    if (tokenParam && isJwtLike(tokenParam)) {
      localStorage.setItem('lamaplanner_access_token', tokenParam);

      // Удаляем токен из URL для безопасности
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);
}
