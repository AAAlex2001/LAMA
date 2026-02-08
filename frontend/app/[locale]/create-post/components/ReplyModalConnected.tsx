'use client';

import { useEffect } from 'react';
import ReplyToPostModal from '@/components/reply-to-post-modal/reply-to-post-modal';
import { useAppDispatch, useAppSelector } from '../store';
import { selectSelectedChannels } from '../store/selectors';
import * as replyToPostSlice from '../store/slices/replyToPost';
import * as uiSlice from '../store/slices/ui';
import { fetchMorePosts, getPostById, searchPosts, fetchPosts } from '../store/thunks';
import type { Post } from '../store/types';

export default function ReplyModalConnected() {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector(state => state.ui.showReplyModal);
  const replyToPostState = useAppSelector(state => state.replyToPost);

  const selectedChannels = useAppSelector(selectSelectedChannels);
  const primaryChannel = selectedChannels[0];

  useEffect(() => {
    if (!isOpen || !primaryChannel) return;

    if (replyToPostState.searchQuery) {
      const timeoutId = setTimeout(() => {
        dispatch(searchPosts({ channelId: primaryChannel.id, query: replyToPostState.searchQuery }));
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      dispatch(fetchPosts(primaryChannel.id));
    }
  }, [replyToPostState.searchQuery, isOpen, primaryChannel, dispatch]);

  return (
    <ReplyToPostModal
      isOpen={isOpen}
      posts={replyToPostState.items}
      isLoading={replyToPostState.isLoading}
      isLoadingMore={replyToPostState.isLoadingMore}
      hasMore={replyToPostState.hasMore}
      searchQuery={replyToPostState.searchQuery}
      selectedPostId={replyToPostState.selectedPostId}
      onSearchQueryChange={(q) => dispatch(replyToPostSlice.setSearchQuery(q))}
      onLoadMore={() => primaryChannel && dispatch(fetchMorePosts(primaryChannel.id))}
      onSelect={(post: Post) => {
        dispatch(getPostById(post.id));
        dispatch(uiSlice.setShowReplyModal(false));
      }}
      onClose={() => dispatch(uiSlice.setShowReplyModal(false))}
    />
  );
}
