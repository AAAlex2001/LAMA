'use client';

import { useEffect, useMemo, useState } from 'react';
import ReplyToPostModal from '@/components/reply-to-post-modal/reply-to-post-modal';
import { usePublicationsListQuery } from '@/store/publications/queries';
import { useAppDispatch, useAppSelector } from '../store';
import { useSelectedChannels } from '../hooks/useSelectedChannels';
import * as settingsSlice from '../store/slices/settings';
import * as uiSlice from '../store/slices/ui';
import type { Post } from '../store/types';

export default function ReplyModalConnected() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.showReplyModal);
  const replyToPostId = useAppSelector((s) => s.settings.replyToPostId);
  const selectedChannels = useSelectedChannels();
  const primaryChannel = selectedChannels[0];

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    if (!isOpen) setSearchInput('');
  }, [isOpen]);

  const query = usePublicationsListQuery({
    status: 'published',
    channelId: primaryChannel?.id,
    search: debouncedSearch || undefined,
    pageSize: 20,
  });

  const enabled = isOpen && !!primaryChannel;

  useEffect(() => {
    if (!enabled) return;
    if (query.isStale) query.refetch();
  }, [enabled, query]);

  const posts = useMemo(
    () => (query.data?.pages.flatMap((p) => p.items) ?? []) as Post[],
    [query.data],
  );

  return (
    <ReplyToPostModal
      isOpen={isOpen}
      posts={posts}
      isLoading={query.isLoading}
      isLoadingMore={query.isFetchingNextPage}
      hasMore={query.hasNextPage ?? false}
      searchQuery={searchInput}
      selectedPostId={replyToPostId}
      onSearchQueryChange={setSearchInput}
      onLoadMore={() => query.fetchNextPage()}
      onSelect={(post: Post) => {
        dispatch(settingsSlice.setReplyToPostId(post.id));
        dispatch(uiSlice.setShowReplyModal(false));
      }}
      onClose={() => dispatch(uiSlice.setShowReplyModal(false))}
    />
  );
}
