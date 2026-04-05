import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { CreatePostRequest, SeriesResponse, PublicationResponse } from '../types';
import { selectPollData, resetQuiz } from '../slices/quiz';
import { setIsSavingDraft, resetUi } from '../slices/ui';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
import { resetTags } from '../slices/tags';
import { resetReplyToPost } from '../slices/replyToPost';
import { fetchTagsThunk } from './tags';
import { apiRequest } from './api';
import { prepareMediaPayload, buildCreatePostRequest, extractPlainText } from './utils';

interface SaveDraftParams {
  channelIds: number[];
  draftId?: string | null;
}

export const saveDraft = createAsyncThunk(
  'createPost/saveDraft',
  async ({ channelIds, draftId }: SaveDraftParams, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { editor, media, settings, inlineButtons, quiz, series } = state;

    const currentSnapshot = {
      text: editor.text,
      mediaFiles: media.files,
      inlineButtonsOpen: inlineButtons.isOpen,
      buttonRows: inlineButtons.rows,
      quizOpen: quiz.isOpen,
      quizMode: quiz.mode,
      quizQuestion: quiz.question,
      quizAnswers: quiz.answers,
      quizCorrectAnswerId: quiz.correctAnswerId,
      showLinkPreview: editor.showLinkPreview,
    };

    const snapshots = [...series.snapshots];
    snapshots[series.activeIndex] = currentSnapshot;

    const isSeries = snapshots.length >= 2;

    if (!isSeries) {
      const pollData = selectPollData(quiz);
      const plainText = extractPlainText(editor.text);
      if (!plainText && media.files.length === 0 && !pollData) {
        return rejectWithValue('Текст поста или медиа не могут быть пустыми');
      }
    }

    dispatch(setIsSavingDraft(true));

    try {
      if (isSeries) {
        const seriesResponse = await apiRequest<SeriesResponse>('/publications/series', {
          method: 'POST',
          body: JSON.stringify({
            name: `Серия ${new Date().toLocaleString('ru-RU')}`,
            reply_to_previous: true,
          }),
        });
        const seriesId = seriesResponse.id;

        for (let i = 0; i < snapshots.length; i++) {
          const snapshot = snapshots[i];
          const pollData = snapshot.quizOpen ? {
            question: snapshot.quizQuestion,
            options: snapshot.quizAnswers.map(a => a.text).filter(t => t.trim()),
            is_quiz: snapshot.quizMode === 'quiz',
            allows_multiple_answers: snapshot.quizMode === 'poll_multi',
            correct_option_id: snapshot.quizMode === 'quiz'
              ? snapshot.quizAnswers.findIndex(a => a.id === snapshot.quizCorrectAnswerId)
              : null,
          } : null;

          const mediaPayload = await prepareMediaPayload(snapshot.mediaFiles || []);
          const request: CreatePostRequest = {
            ...buildCreatePostRequest(
              snapshot.text, snapshot.showLinkPreview, settings,
              snapshot.buttonRows || [], mediaPayload, pollData, channelIds,
            ),
            series_id: seriesId,
            series_order: i,
          };

          await apiRequest<PublicationResponse>('/publications', {
            method: 'POST', body: JSON.stringify(request),
          });
        }
      } else {
        const pollData = selectPollData(quiz);
        const mediaPayload = await prepareMediaPayload(media.files);
        const request = buildCreatePostRequest(
          editor.text, editor.showLinkPreview, settings, inlineButtons.rows,
          mediaPayload, pollData, channelIds
        );

        if (draftId) {
          await apiRequest(`/publications/${draftId}`, { method: 'PUT', body: JSON.stringify(request) });
        } else {
          await apiRequest('/publications', { method: 'POST', body: JSON.stringify(request) });
        }
      }

      if (settings.selectedTags && settings.selectedTags.length > 0) {
        dispatch(fetchTagsThunk({ force: true }));
      }

      dispatch(resetEditor());
      dispatch(clearFiles());
      dispatch(resetInlineButtons());
      dispatch(resetQuiz());
      dispatch(resetSettings());
      dispatch(resetSeries());
      dispatch(resetTags());
      dispatch(resetReplyToPost());
      dispatch(resetUi());
      return { success: true, message: isSeries ? 'Серия сохранена в черновики!' : 'Черновик сохранён!' };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsSavingDraft(false));
    }
  }
);
