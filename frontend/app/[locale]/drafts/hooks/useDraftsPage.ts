'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector, setSortOrder } from '../store';
import { fetchDrafts, fetchMoreDrafts, deleteDraftThunk } from '../store/thunks';
import { getAccessToken } from '@/app/[locale]/register/store/actions';
import { apiRequest } from '@/store/api';
import type { Draft } from '@/types/post';
import type { Tag, TagsResponse } from '@/types';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { buildDraftPreviewPayload } from '../utils/draftPreview';
import { useDraftsInfiniteScroll } from './useDraftsInfiniteScroll';

type SortKey = 'date' | 'tags' | 'source' | null;

export function useDraftsPage() {
  const dispatch = useAppDispatch();
  const { showSuccess } = useNotifications();
  const drafts = useAppSelector((state) => state.drafts.items);
  const isLoading = useAppSelector((state) => state.drafts.isLoading);
  const isLoadingMore = useAppSelector((state) => state.drafts.isLoadingMore);
  const hasMore = useAppSelector((state) => state.drafts.hasMore);
  const sortOrder = useAppSelector((state) => state.drafts.sortOrder);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  const [openSort, setOpenSort] = useState<SortKey>(null);
  const defaultSortByDate = 'Сначала новые';
  const defaultSortByTags = 'По тегам';
  const defaultSortBySource = 'По источнику';
  const [sortByDate, setSortByDateLocal] = useState(defaultSortByDate);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [sortBySource, setSortBySource] = useState(defaultSortBySource);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isInitialDraftsLoaded, setIsInitialDraftsLoaded] = useState(false);
  const initialLoadCompletedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortBarRef = useRef<HTMLDivElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  function setSortByDate(value: string) {
    setSortByDateLocal(value);
    const newOrder = value === 'Сначала старые' ? 'asc' as const : 'desc' as const;
    dispatch(setSortOrder(newOrder));
  }

  useQuery({
    queryKey: ['drafts', sortOrder, selectedTagIds],
    queryFn: async () => {
      const result = await dispatch(fetchDrafts({ tagIds: selectedTagIds })).unwrap();
      if (!initialLoadCompletedRef.current) {
        initialLoadCompletedRef.current = true;
        setIsInitialDraftsLoaded(true);
      }
      return result;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ['drafts-tags'],
    queryFn: async () => {
      const response = await apiRequest<TagsResponse>('/publications/tags/?page=1&page_size=100');
      return response.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useDraftsInfiniteScroll(dispatch, hasMore, isLoadingMore);

  useEffect(() => {
    if (!openSort && !mobileFilterOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inSortBar = sortBarRef.current?.contains(target);
      const inMobileFilter = mobileFilterRef.current?.contains(target);
      if (!inSortBar && !inMobileFilter) {
        setOpenSort(null);
        setMobileFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openSort, mobileFilterOpen]);

  function confirmDelete() {
    if (deleteConfirmId !== null) {
      dispatch(deleteDraftThunk(deleteConfirmId)).then(() => showSuccess('Черновик удалён'));
      setDeleteConfirmId(null);
    }
  }

  const previewData = previewDraft ? buildDraftPreviewPayload(previewDraft) : null;

  const token = getAccessToken() || undefined;
  const showPageLoader = !isInitialDraftsLoaded || (isLoading && drafts.length === 0);

  const visibleDrafts = selectedTagIds.length === 0
    ? drafts
    : drafts.filter((draft) => {
      const draftTagIds = draft.tags?.map((tag) => tag.id) || [];
      return selectedTagIds.some((tagId) => draftTagIds.includes(tagId));
    });

  const [shareDraft, setShareDraft] = useState<Draft | null>(null);

  function handleShare(draft: Draft) {
    setShareDraft(draft);
  }

  function handleEdit(draft: Draft) {
    window.location.href = `edit-draft?draft=${draft.id}`;
  }

  const dateOptions = ['Сначала новые', 'Сначала старые'];
  const sourceOptions = [defaultSortBySource, 'Все', 'Из парсера', 'Созданы мной'];

  const tagOptions = allTags.length > 0
    ? allTags.map((tag: Tag) => ({ id: tag.id, name: tag.name }))
    : (() => {
        const tagMap = new Map<number, { id: number; name: string; latestAt: number }>();
        drafts.forEach((draft) => {
          const timestamp = new Date(draft.updated_at || draft.created_at).getTime();
          draft.tags?.forEach((tag) => {
            const existing = tagMap.get(tag.id);
            if (!existing || timestamp > existing.latestAt) {
              tagMap.set(tag.id, { id: tag.id, name: tag.name, latestAt: timestamp });
            }
          });
        });
        return Array.from(tagMap.values()).sort((a, b) => b.latestAt - a.latestAt);
      })();

  const isDateActive = sortByDate !== defaultSortByDate;
  const isTagsActive = selectedTagIds.length > 0;
  const isSourceActive = sortBySource !== defaultSortBySource;
  const tagButtonLabel = selectedTagIds.length === 0
    ? defaultSortByTags
    : selectedTagIds.length === 1
      ? (tagOptions.find((tag) => tag.id === selectedTagIds[0])?.name || defaultSortByTags)
      : `${defaultSortByTags} (${selectedTagIds.length})`;

  return {
    drafts: visibleDrafts,
    isLoading,
    isLoadingMore,
    hasMore,
    deleteConfirmId,
    setDeleteConfirmId,
    previewDraft,
    setPreviewDraft,
    openSort,
    setOpenSort,
    sortByDate,
    setSortByDate,
    selectedTagIds,
    setSelectedTagIds,
    sortBySource,
    setSortBySource,
    mobileFilterOpen,
    setMobileFilterOpen,
    scrollRef,
    sortBarRef,
    mobileFilterRef,
    dateOptions,
    sourceOptions,
    tagOptions,
    isDateActive,
    isTagsActive,
    isSourceActive,
    tagButtonLabel,
    token,
    showPageLoader,
    isInitialDraftsLoaded,
    handleShare,
    handleEdit,
    confirmDelete,
    previewData,
    shareDraft,
    setShareDraft,
    defaultSortByDate,
    defaultSortBySource,
  };
}
