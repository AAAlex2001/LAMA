'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSharedDraftQuery } from '@/store/publications/queries';

export function useSharedDraftFromUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const param = searchParams?.get('token');
    if (!param || token === param) return;

    setToken(param);

    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [searchParams, token, router]);

  const query = useSharedDraftQuery(token);

  return {
    token,
    setToken,
    draft: query.data ?? null,
    isLoading: query.isLoading,
    isExpired: query.isError,
  };
}
