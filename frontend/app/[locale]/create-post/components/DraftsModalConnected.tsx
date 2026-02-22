'use client';

import { useState, useMemo, useEffect } from 'react';
import DraftsModal from '@/components/drafts-modal/drafts-modal';
import PostPreviewModal from '@/components/post-preview-modal';
import { getAccessToken } from '@/app/[locale]/register/store/actions';
import { useAppDispatch, useAppSelector } from '../store';
import * as draftsSlice from '../store/slices/drafts';
import * as uiSlice from '../store/slices/ui';
import { loadDraftIntoStore, fetchMoreDrafts, deleteDraftThunk, searchDrafts, fetchDrafts } from '../store/thunks';
import type { Draft, MediaFile } from '../store/types';
import { useNotifications } from '@/components/notifications/NotificationProvider';

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

export default function DraftsModalConnected() {
  const dispatch = useAppDispatch();
  const { showSuccess } = useNotifications();
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);

  const isOpen = useAppSelector(state => state.ui.showDraftsModal);
  const draftsState = useAppSelector(state => state.drafts);

  const previewData = useMemo(() => {
    if (!previewDraft) return null;
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
  }, [previewDraft]);

  const token = getAccessToken() || undefined;

  useEffect(() => {
    if (!isOpen) return;

    if (draftsState.searchQuery) {
      const timeoutId = setTimeout(() => {
        dispatch(searchDrafts(draftsState.searchQuery));
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      dispatch(fetchDrafts());
    }
  }, [draftsState.searchQuery, isOpen, dispatch]);

  return (
    <>
      <DraftsModal
        isOpen={isOpen}
        drafts={draftsState.items}
        isLoading={draftsState.isLoading}
        isLoadingMore={draftsState.isLoadingMore}
        hasMore={draftsState.hasMore}
        searchQuery={draftsState.searchQuery}
        selectedDraftId={draftsState.selectedDraftId}
        onSearchQueryChange={(q) => dispatch(draftsSlice.setSearchQuery(q))}
        onLoadMore={() => dispatch(fetchMoreDrafts())}
        onDelete={(id) => dispatch(deleteDraftThunk(id)).then(() => showSuccess('Черновик удалён'))}
        onSelect={(draft: Draft) => {
          loadDraftIntoStore(draft, dispatch);
          dispatch(uiSlice.setShowDraftsModal(false));
        }}
        onPreview={(draft: Draft) => setPreviewDraft(draft)}
        onClose={() => dispatch(uiSlice.setShowDraftsModal(false))}
      />
      {previewData && (
        <PostPreviewModal
          isOpen={!!previewDraft}
          onClose={() => setPreviewDraft(null)}
          channelTitle={previewData.channelTitle}
          channelExtraCount={previewData.channelExtraCount}
          channelPhotoUrl={previewData.channelPhotoUrl}
          channelMembersCount={previewData.channelMembersCount}
          html={previewData.html}
          mediaFiles={previewData.mediaFiles}
          quizData={previewData.quizData}
          inlineKeyboard={previewData.inlineKeyboard}
          token={token}
        />
      )}
    </>
  );
}
