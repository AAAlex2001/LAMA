'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DraftsModal from '@/components/drafts-modal/drafts-modal';
import PostPreviewModal, { buildDraftPreviewPayload } from '@/components/post-preview-modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { apiRequest, getAuthToken } from '@/store/api';
import { invalidatePublications, usePublicationsListQuery } from '@/store/publications/queries';
import { useDebounce } from '@/hooks/useDebounce';
import { useAppDispatch, useAppSelector } from '../store';
import { setShowDraftsModal } from '../store/slices/ui';
import { loadDraftIntoStore } from '../store/thunks';
import type { Draft } from '../store/types';

export default function DraftsModalConnected() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { showSuccess } = useNotifications();
  const isOpen = useAppSelector((s) => s.ui.showDraftsModal);

  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const drafts = usePublicationsListQuery({
    status: 'draft',
    sortOrder: 'desc',
    dateMode: 'updated',
    search: debouncedSearch || undefined,
    pageSize: 20,
  });

  const items = (drafts.data?.pages.flatMap((p) => p.items) ?? []) as Draft[];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/publications/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidatePublications(queryClient),
  });

  const close = () => dispatch(setShowDraftsModal(false));
  const previewPayload = previewDraft ? buildDraftPreviewPayload(previewDraft) : null;

  return (
    <>
      <DraftsModal
        isOpen={isOpen}
        drafts={items}
        isLoading={drafts.isLoading}
        isLoadingMore={drafts.isFetchingNextPage}
        hasMore={drafts.hasNextPage ?? false}
        searchQuery={search}
        selectedDraftId={null}
        onSearchQueryChange={setSearch}
        onLoadMore={() => drafts.fetchNextPage()}
        onDelete={(id) => deleteMutation.mutateAsync(id).then(() => showSuccess('Черновик удалён'))}
        onSelect={(draft) => {
          loadDraftIntoStore(draft, dispatch);
          close();
        }}
        onPreview={setPreviewDraft}
        onClose={close}
      />
      {previewPayload && (
        <PostPreviewModal
          isOpen={!!previewDraft}
          onClose={() => setPreviewDraft(null)}
          token={getAuthToken() || undefined}
          {...previewPayload}
        />
      )}
    </>
  );
}
