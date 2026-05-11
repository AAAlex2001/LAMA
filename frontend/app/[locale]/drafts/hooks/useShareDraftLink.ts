'use client';

import { useEffect, useState } from 'react';
import type { Draft } from '@/types/post';
import { useShareDraftLinkMutation } from '@/store/publications/queries';

export function useShareDraftLink(draft: Draft | null) {
  const [shareLink, setShareLink] = useState('');
  const mutation = useShareDraftLinkMutation();

  useEffect(() => {
    if (!draft) {
      setShareLink('');
      mutation.reset();
      return;
    }
    mutation
      .mutateAsync(draft.id)
      .then(({ share_token }) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setShareLink(`${origin}/drafts?token=${share_token}`);
      })
      .catch(() => setShareLink(''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return { shareLink, isGeneratingShareLink: mutation.isPending };
}
