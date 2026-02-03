'use client';

import PostPreviewModal from '@/components/post-preview-modal';
import { getAccessToken } from '@/app/[locale]/register/store/actions';
import { useAppDispatch, useAppSelector } from '../store';
import { selectSelectedChannels } from '../store/selectors';
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

  const selectedChannels = useAppSelector(selectSelectedChannels);
  const selectedCount = selectedChannels.length;
  const primaryChannel = selectedChannels.length > 0 ? selectedChannels[0] : undefined;
  const channelExtraCount = selectedCount > 1 ? `+${selectedCount - 1}` : undefined;

  const quizPreviewMode = quizMode === 'quiz' ? 'quiz' : 'poll';

  const quizPreviewData = quizOpen && quizQuestion.trim() ? {
    mode: quizPreviewMode as 'quiz' | 'poll',
    question: quizQuestion,
    options: quizAnswers.map(a => a.text),
    isAnonymous: true,
    allowsMultipleAnswers: quizMode === 'poll_multi',
    correctAnswerIndex: quizMode === 'quiz' && quizCorrectAnswerId
      ? quizAnswers.findIndex(a => a.id === quizCorrectAnswerId)
      : undefined,
  } : undefined;

  const inlineKeyboardPreview = inlineButtonsOpen && buttonRows.length > 0 ? {
    buttons: buttonRows
      .map(row => row.buttons.filter(btn => btn.text.trim()).map(btn => ({ text: btn.text, type: btn.type })))
      .filter(row => row.length > 0),
  } : undefined;

  const token = getAccessToken() || undefined;

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
