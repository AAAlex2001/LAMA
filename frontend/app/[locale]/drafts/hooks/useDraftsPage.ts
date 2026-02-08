'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchDrafts, fetchMoreDrafts, deleteDraftThunk } from '../store/thunks';
import { getAccessToken } from '@/app/[locale]/register/store/actions';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import type { Draft, MediaFile, Tag, TagsResponse } from '@/app/[locale]/create-post/store/types';

type SortKey = 'date' | 'tags' | 'source' | null;

function getMediaType(url: string): 'image' | 'video' | 'document' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'document';
}

function draftToMediaFiles(draft: Draft): MediaFile[] {
  if (!draft.media_urls?.length) return [];
  return draft.media_urls.map((url, index) => ({
    id: `draft-media-${draft.id}-${index}`,
    url,
    type: getMediaType(url),
    blur: draft.media_blur?.[index] ?? false,
    thumbnail_url: draft.media_thumbnail_urls?.[index] ?? null,
    telegram_file_id: draft.media_file_ids?.[index] ?? null,
  }));
}

export function useDraftsPage() {
  const dispatch = useAppDispatch();
  const drafts = useAppSelector(state => state.drafts.items);
  const isLoading = useAppSelector(state => state.drafts.isLoading);
  const isLoadingMore = useAppSelector(state => state.drafts.isLoadingMore);
  const hasMore = useAppSelector(state => state.drafts.hasMore);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  const [openSort, setOpenSort] = useState<SortKey>(null);
  const defaultSortByDate = 'Сначала новые';
  const defaultSortByTags = 'По тегам';
  const defaultSortBySource = 'По источнику';
  const [sortByDate, setSortByDate] = useState(defaultSortByDate);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [sortBySource, setSortBySource] = useState(defaultSortBySource);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortBarRef = useRef<HTMLDivElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchDrafts({ tagIds: selectedTagIds }));
  }, [dispatch, selectedTagIds]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const queryParams = new URLSearchParams({
          page: '1',
          page_size: '100',
        });
        const response = await apiRequest<TagsResponse>(`/publications/tags/?${queryParams}`);
        setAllTags(response.items || []);
      } catch {
        setAllTags([]);
      }
    };
    loadTags();
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = document.documentElement;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !isLoadingMore) {
      dispatch(fetchMoreDrafts());
    }
  }, [dispatch, hasMore, isLoadingMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!openSort && !mobileFilterOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inSortBar = sortBarRef.current?.contains(target);
      const inMobileFilter = mobileFilterRef.current?.contains(target);
      if (!inSortBar && !inMobileFilter) {
        setOpenSort(null);
        setMobileFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openSort, mobileFilterOpen]);

  const confirmDelete = () => {
    if (deleteConfirmId !== null) {
      dispatch(deleteDraftThunk(deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const previewData = previewDraft ? (() => {
    const channel = previewDraft.channels?.[0];
    const extraCount = previewDraft.channels?.length > 1
      ? `+${previewDraft.channels.length - 1}`
      : undefined;
    return {
      channelTitle: channel?.title,
      channelPhotoUrl: channel?.photo_url,
      channelMembersCount: channel?.members_count,
      channelExtraCount: extraCount,
      html: previewDraft.formatted_content?.text || previewDraft.text_content || '',
      mediaFiles: draftToMediaFiles(previewDraft),
      inlineKeyboard: previewDraft.inline_keyboard?.buttons?.length
        ? { buttons: previewDraft.inline_keyboard.buttons }
        : undefined,
      quizData: previewDraft.poll_data?.question ? {
        mode: (previewDraft.poll_data.is_quiz ? 'quiz' : 'poll') as 'quiz' | 'poll',
        question: previewDraft.poll_data.question,
        options: previewDraft.poll_data.options,
        isAnonymous: previewDraft.poll_data.is_anonymous ?? true,
        allowsMultipleAnswers: previewDraft.poll_data.allows_multiple_answers ?? false,
        correctAnswerIndex: previewDraft.poll_data.correct_option_id ?? undefined,
      } : undefined,
    };
  })() : null;

  const token = getAccessToken() || undefined;
  const showPageLoader = isLoading && drafts.length === 0;

  const handleShare = (draft: Draft) => {
    const text = draft.formatted_content?.text || draft.text_content || '';
    const plainText = text.replace(/<[^>]*>/g, '');
    if (navigator.share) {
      navigator.share({ text: plainText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(plainText).catch(() => {});
    }
  };

  const handleEdit = (draft: Draft) => {
    window.location.href = `create-post?draft=${draft.id}`;
  };

  const dateOptions = ['Сначала новые', 'Сначала старые'];
  const sourceOptions = [defaultSortBySource, 'Все', 'Из парсера', 'Созданы мной'];
  const fallbackTagOptions = (() => {
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

  const tagOptions = allTags.length > 0
    ? allTags.map((tag) => ({ id: tag.id, name: tag.name }))
    : fallbackTagOptions;

  const isDateActive = sortByDate !== defaultSortByDate;
  const isTagsActive = selectedTagIds.length > 0;
  const isSourceActive = sortBySource !== defaultSortBySource;
  const tagButtonLabel = selectedTagIds.length === 0
    ? defaultSortByTags
    : selectedTagIds.length === 1
      ? (tagOptions.find((tag) => tag.id === selectedTagIds[0])?.name || defaultSortByTags)
      : `${defaultSortByTags} (${selectedTagIds.length})`;

  const sortedDrafts = (() => {
    if (sortByDate === 'Сначала новые' || sortByDate === 'Сначала старые') {
      const isDesc = sortByDate === 'Сначала новые';
      return [...drafts].sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime();
        const bTime = new Date(b.updated_at || b.created_at).getTime();
        return isDesc ? bTime - aTime : aTime - bTime;
      });
    }
    return drafts;
  })();

  return {
    drafts: sortedDrafts,
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
    handleShare,
    handleEdit,
    confirmDelete,
    previewData,
    defaultSortByDate,
    defaultSortBySource,
  };
}
