'use client';

import PostPreviewModal from '@/components/post-preview-modal';
import { getAuthToken } from '@/store/api';
import { useAppDispatch, useAppSelector } from '../store';
import { useSelectedChannels } from '../hooks/useSelectedChannels';
import * as uiSlice from '../store/slices/ui';
import type { MediaFile as MediaPreviewFile } from '@/components/media-preview/media-preview';

export default function PostPreviewModalConnected() {
  const dispatch = useAppDispatch();

  const showPreviewModal = useAppSelector(state => state.ui.showPreviewModal);
  const text = useAppSelector(state => state.editor.text);
  const mediaFiles = useAppSelector(state => state.media.files);
  const inlineButtonsOpen = useAppSelector(state => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector(state => state.inlineButtons.rows);
  const quizState = useAppSelector(state => state.quiz);
  const quizOpen = quizState.isOpen;
  const quizMode = quizState.mode;
  const quizQuestion = quizState.question;
  const quizAnswers = quizState.answers;
  const quizCorrectAnswerId = quizState.correctAnswerId;

  const selectedChannels = useSelectedChannels();
  const selectedCount = selectedChannels.length;
  const primaryChannel = selectedChannels.length > 0 ? selectedChannels[0] : undefined;
  const channelExtraCount = selectedCount > 1 ? `+${selectedCount - 1}` : undefined;

  const quizPreviewMode = quizMode === 'quiz' ? 'quiz' : 'poll';
  const filledAnswers = quizAnswers.filter(a => a.text.trim());
  const quizPreviewOptions = filledAnswers.map(a => a.text);

  const quizPreviewData = quizOpen && quizQuestion.trim() && quizPreviewOptions.length > 0 ? {
    mode: quizPreviewMode as 'quiz' | 'poll',
    question: quizQuestion,
    options: quizPreviewOptions,
    isAnonymous: true,
    allowsMultipleAnswers: quizMode === 'poll_multi',
    correctAnswerIndex: quizMode === 'quiz' && quizCorrectAnswerId
      ? filledAnswers.findIndex(a => a.id === quizCorrectAnswerId)
      : undefined,
  } : undefined;

  const inlineKeyboardPreview = inlineButtonsOpen && buttonRows.length > 0 ? {
    buttons: buttonRows
      .map(row => row.buttons.filter(btn => btn.text.trim()).map(btn => ({ text: btn.text, type: btn.type })))
      .filter(row => row.length > 0),
  } : undefined;

  const token = getAuthToken() || undefined;

  return (
    <PostPreviewModal
      isOpen={showPreviewModal}
      onClose={() => dispatch(uiSlice.setShowPreviewModal(false))}
      channelTitle={primaryChannel?.title}
      channelExtraCount={channelExtraCount}
      channelPhotoUrl={primaryChannel?.photo_url}
      channelMembersCount={primaryChannel?.members_count}
      html={text}
      mediaFiles={mediaFiles as MediaPreviewFile[]}
      quizData={quizPreviewData}
      inlineKeyboard={inlineKeyboardPreview}
      token={token}
    />
  );
}
