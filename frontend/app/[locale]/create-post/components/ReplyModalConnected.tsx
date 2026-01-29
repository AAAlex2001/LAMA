'use client';

import ReplyToPostModal from '@/components/reply-to-post-modal/reply-to-post-modal';
import { useAppDispatch, useAppSelector } from '../store';
import * as replyToPostSlice from '../store/slices/replyToPost';
import * as uiSlice from '../store/slices/ui';
import { fetchMorePosts, getPostById } from '../store/thunks';
import type { Post } from '../store/types';

export default function ReplyModalConnected() {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector(state => state.ui.showReplyModal);
  const replyToPostState = useAppSelector(state => state.replyToPost);

  const selectedChannels = useAppSelector(state => state.channels.channels.filter(c => c.selected));
  const primaryChannel = selectedChannels[0];

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
