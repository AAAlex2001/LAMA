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

  useEffect(() => {
    const token = searchParams?.get('token');
    
    if (token) {
      // Сохраняем токен в localStorage
      localStorage.setItem('lamaplanner_access_token', token);
      
      // Удаляем токен из URL для безопасности
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      router.replace(url.pathname + url.search, { scroll: false });
      
      console.log('✅ Токен из URL сохранён');
    }
  }, [searchParams, router]);
}
