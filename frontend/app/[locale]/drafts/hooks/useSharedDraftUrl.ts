'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function useSharedDraftUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sharedToken, setSharedToken] = useState<string | null>(null);
  const [sharedDraft, setSharedDraft] = useState<Record<string, unknown> | null>(null);
  const [showSharedDraftModal, setShowSharedDraftModal] = useState(false);
  const [showExpiredLinkModal, setShowExpiredLinkModal] = useState(false);

  function clearTokenFromUrl() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    router.replace(url.pathname + url.search, { scroll: false });
  }

  useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (!tokenParam) return;
    if (sharedToken === tokenParam) return;

    setSharedToken(tokenParam);
    setSharedDraft(null);
    setShowExpiredLinkModal(false);

    const fetchSharedDraft = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/shared/${tokenParam}`);
        if (!response.ok) {
          setShowExpiredLinkModal(true);
          clearTokenFromUrl();
          return;
        }
        const data = await response.json();
        setSharedDraft(data);
        setShowSharedDraftModal(true);
        clearTokenFromUrl();
      } catch {
        setShowExpiredLinkModal(true);
        clearTokenFromUrl();
      }
    };

    fetchSharedDraft();
  }, [searchParams, sharedToken]);

  return {
    sharedToken,
    sharedDraft,
    showSharedDraftModal,
    setShowSharedDraftModal,
    showExpiredLinkModal,
    setShowExpiredLinkModal,
    setSharedDraft,
    setSharedToken,
  };
}
