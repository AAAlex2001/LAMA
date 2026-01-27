import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { selectPollData } from './slices/quiz';
import type { InlineKeyboard, PostSnapshot } from './types';

export const selectEditorText = (state: RootState) => state.editor.text;
export const selectShowLinkPreview = (state: RootState) => state.editor.showLinkPreview;

export const selectMediaFiles = (state: RootState) => state.media.files;
export const selectMediaCount = (state: RootState) => state.media.files.length;

export const selectInlineButtonsOpen = (state: RootState) => state.inlineButtons.isOpen;
export const selectInlineButtonRows = (state: RootState) => state.inlineButtons.rows;

export const selectQuizOpen = (state: RootState) => state.quiz.isOpen;
export const selectQuizState = (state: RootState) => state.quiz;

export const selectChannels = (state: RootState) => state.settings.channels;
export const selectSelectedChannels = createSelector(
  selectChannels,
  channels => channels.filter(c => c.checked)
);
export const selectSelectedCount = createSelector(
  selectSelectedChannels,
  channels => channels.length
);
export const selectPrimaryChannel = createSelector(
  selectSelectedChannels,
  channels => channels.length === 1 ? channels[0] : undefined
);

export const selectTagName = (state: RootState) => state.settings.selectedTagName;
export const selectTagColor = (state: RootState) => state.settings.selectedTagColor;
export const selectRecentTags = (state: RootState) => state.settings.recentTags;

export const selectUiState = (state: RootState) => state.ui;
export const selectIsPublishing = (state: RootState) => state.ui.isPublishing;
export const selectIsSavingDraft = (state: RootState) => state.ui.isSavingDraft;
export const selectIsScheduling = (state: RootState) => state.ui.isScheduling;
export const selectShowPreviewModal = (state: RootState) => state.ui.showPreviewModal;
export const selectShowMobileSettings = (state: RootState) => state.ui.showMobileSettings;

export const selectSnapshots = (state: RootState) => state.series.snapshots;
export const selectActiveIndex = (state: RootState) => state.series.activeIndex;
export const selectActiveSnapshot = createSelector(
  selectSnapshots,
  selectActiveIndex,
  (snapshots, index) => snapshots[index]
);
export const selectIsSeriesMode = createSelector(
  selectSnapshots,
  snapshots => snapshots.length > 1
);

export const selectCanAddMedia = createSelector(
  selectMediaCount,
  selectInlineButtonRows,
  (mediaCount, rows) => {
    const maxFiles = rows.length > 0 ? 1 : 10;
    return mediaCount < maxFiles;
  }
);

export const selectCanShowInlineButtons = createSelector(
  selectMediaCount,
  count => count <= 1
);

function extractPlainText(html: string): string {
  return (html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export const selectHasContentForPreview = createSelector(
  selectEditorText,
  selectMediaFiles,
  selectQuizState,
  selectInlineButtonsOpen,
  selectInlineButtonRows,
  (text, files, quizState, buttonsOpen, rows) => {
    const hasText = extractPlainText(text).length > 0;
    const hasMedia = files.length > 0;
    const pollData = selectPollData(quizState);
    const hasPoll = !!pollData;
    const hasButtons = buttonsOpen && rows.length > 0;
    return hasText || hasMedia || hasPoll || hasButtons;
  }
);

export const selectCanReplyToPost = createSelector(
  selectSelectedCount,
  count => count === 1
);

export const selectQuizPreviewData = createSelector(
  selectQuizState,
  quizState => {
    const pollData = selectPollData(quizState);
    if (!pollData) return undefined;
    
    return {
      mode: pollData.is_quiz ? 'quiz' as const : 'poll' as const,
      question: pollData.question,
      options: pollData.options,
      isAnonymous: true,
      allowsMultipleAnswers: pollData.allows_multiple_answers || false,
      correctAnswerIndex: typeof pollData.correct_option_id === 'number' ? pollData.correct_option_id : undefined,
    };
  }
);

export const selectInlineKeyboardPreview = createSelector(
  selectInlineButtonsOpen,
  selectInlineButtonRows,
  (isOpen, rows): InlineKeyboard | undefined => {
    if (!isOpen || rows.length === 0) return undefined;
    
    const buttons = rows
      .map(row =>
        row.buttons
          .filter(btn => btn.text && btn.text.trim())
          .map(btn => ({ text: btn.text, type: btn.type }))
      )
      .filter(row => row.length > 0);
    
    return buttons.length > 0 ? { buttons } : undefined;
  }
);

export const selectCurrentSnapshot = createSelector(
  selectEditorText,
  selectMediaFiles,
  selectInlineButtonsOpen,
  selectInlineButtonRows,
  selectQuizState,
  selectShowLinkPreview,
  (text, files, buttonsOpen, rows, quiz, showLinkPreview): PostSnapshot => ({
    text,
    mediaFiles: files,
    inlineButtonsOpen: buttonsOpen,
    buttonRows: rows,
    quizOpen: quiz.isOpen,
    quizMode: quiz.mode,
    quizQuestion: quiz.question,
    quizAnswers: quiz.answers,
    quizCorrectAnswerId: quiz.correctAnswerId,
    showLinkPreview,
  })
);
