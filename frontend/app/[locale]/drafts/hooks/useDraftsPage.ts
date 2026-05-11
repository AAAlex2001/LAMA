'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getAuthToken } from '@/store/api';
import { useTagsQuery } from '@/store/tags/queries';
import { invalidatePublications, usePublicationsListQuery } from '@/store/publications/queries';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { buildDraftPreviewPayload } from '@/components/post-preview-modal';
import { groupSeriesPosts } from '@/store/publications/groupSeries';
import type { Draft } from '@/types/post';
import { useDraftsFilters, getTagOptions, getTagButtonLabel } from './useDraftsFilters';

export function useDraftsPage() {
  const { showSuccess } = useNotifications();
  const queryClient = useQueryClient();

  const { data: allTags = [] } = useTagsQuery();
  const filters = useDraftsFilters();

  const draftsQuery = usePublicationsListQuery({
    status: 'draft',
    tagIds: filters.selectedTagIds,
    sortOrder: filters.sortOrder,
    dateMode: 'updated',
  });

  const flatDrafts: Draft[] = groupSeriesPosts(
    draftsQuery.data?.pages.flatMap((p) => p.items) ?? [],
  );

  const tagOptions = getTagOptions(allTags, flatDrafts);
  const tagButtonLabel = getTagButtonLabel(tagOptions, filters.selectedTagIds);

  const visibleDrafts = filters.selectedTagIds.length === 0
    ? flatDrafts
    : flatDrafts.filter((draft) => {
      const draftTagIds = draft.tags?.map((t) => t.id) || [];
      return filters.selectedTagIds.some((id) => draftTagIds.includes(id));
    });

  const [deleteConfirmDraft, setDeleteConfirmDraft] = useState<Draft | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  const [shareDraft, setShareDraft] = useState<Draft | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/publications/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidatePublications(queryClient),
  });
  const deleteSeriesMutation = useMutation({
    mutationFn: (seriesId: number) => apiRequest(`/publications/series/${seriesId}`, { method: 'DELETE' }),
    onSuccess: () => invalidatePublications(queryClient),
  });

  async function confirmDelete() {
    if (!deleteConfirmDraft) return;
    try {
      if (deleteConfirmDraft.series_id) {
        await deleteSeriesMutation.mutateAsync(deleteConfirmDraft.series_id);
        showSuccess('Серия черновиков удалена');
      } else {
        await deleteMutation.mutateAsync(deleteConfirmDraft.id);
        showSuccess('Черновик удалён');
      }
    } catch {
      // mutation хранит ошибку
    } finally {
      setDeleteConfirmDraft(null);
    }
  }

  useEffect(() => {
    const scrollContainer = document.querySelector('main');
    function shouldLoadMore() {
      if (!draftsQuery.hasNextPage || draftsQuery.isFetchingNextPage) return false;
      if (scrollContainer) {
        const { scrollHeight, scrollTop, clientHeight } = scrollContainer;
        return scrollHeight - scrollTop <= clientHeight + 120;
      }
      const fullHeight = document.documentElement.scrollHeight;
      const viewport = window.innerHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      return fullHeight - (scrollTop + viewport) <= 120;
    }
    function onScroll() {
      if (shouldLoadMore()) draftsQuery.fetchNextPage();
    }
    scrollContainer?.addEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      scrollContainer?.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, [draftsQuery]);

  return {
    drafts: visibleDrafts,
    isLoading: draftsQuery.isLoading,
    isLoadingMore: draftsQuery.isFetchingNextPage,
    hasMore: draftsQuery.hasNextPage ?? false,
    isInitialDraftsLoaded: !draftsQuery.isLoading,
    showPageLoader: draftsQuery.isLoading && flatDrafts.length === 0,
    scrollRef,
    ...filters,
    tagOptions,
    tagButtonLabel,
    deleteConfirmDraft,
    setDeleteConfirmDraft,
    confirmDelete,
    previewDraft,
    setPreviewDraft,
    previewData: previewDraft ? buildDraftPreviewPayload(previewDraft) : null,
    shareDraft,
    setShareDraft,
    handleShare: (draft: Draft) => setShareDraft(draft),
    handleEdit: (draft: Draft) => { window.location.href = `edit-draft?draft=${draft.id}`; },
    token: getAuthToken() || undefined,
  };
}
