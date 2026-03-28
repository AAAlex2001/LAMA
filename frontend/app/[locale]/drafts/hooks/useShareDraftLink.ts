'use client';

import { useEffect, useState } from 'react';
import type { Draft } from '@/types/post';

export function useShareDraftLink(shareDraft: Draft | null) {
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);

  useEffect(() => {
    if (!shareDraft) {
      setShareLink('');
      setIsGeneratingShareLink(false);
      return;
    }

    const generateTokenAndGetLink = async () => {
      setIsGeneratingShareLink(true);
      try {
        const accessToken = localStorage.getItem('lamaplanner_access_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/${shareDraft.id}/share`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/drafts?token=${data.share_token}`;
        setShareLink(link);
      } catch {
        setShareLink('');
      } finally {
        setIsGeneratingShareLink(false);
      }
    };

    generateTokenAndGetLink();
  }, [shareDraft]);

  return { shareLink, isGeneratingShareLink };
}
