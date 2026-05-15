'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function useTokenFromUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const isJwtLike = (value: string) => {
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  };

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    
    if (tokenParam && isJwtLike(tokenParam)) {
      localStorage.setItem('lamaplanner_access_token', tokenParam);

      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);
}
