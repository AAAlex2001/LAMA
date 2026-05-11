import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { CreatePostRequest, SeriesResponse, PublicationResponse } from '../types';
import { setIsScheduling, resetUi } from '../slices/ui';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetQuiz } from '../slices/quiz';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
import { invalidateTags } from '@/store/tags/queries';
import { invalidatePublications } from '@/store/publications/queries';
import { apiRequest } from '@/store/api';
import { prepareMediaPayload, buildCreatePostRequest, validatePost, validateTelegramMediaRules, validateInlineButtons, validateQuizState } from './utils';

interface ScheduleSeriesParams {
  channelIds: number[];
  scheduledDates: Date[];
}

export const scheduleSeries = createAsyncThunk(
  'createPost/scheduleSeries',
  async ({ channelIds, scheduledDates }: ScheduleSeriesParams, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { series, settings, editor, media, inlineButtons, quiz } = state;

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

    if (snapshots.length < 2) return rejectWithValue('Серия должна содержать минимум 2 поста');
    if (channelIds.length === 0) return rejectWithValue('Выберите хотя бы один канал');
    if (scheduledDates.length !== snapshots.length) return rejectWithValue('Укажите дату для каждого поста');

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

      const error = validatePost(snapshot.text, snapshot.mediaFiles?.length || 0, pollData, channelIds);
      if (error) return rejectWithValue(`Пост ${i + 1}: ${error}`);
      const mediaError = validateTelegramMediaRules(snapshot.text, snapshot.mediaFiles || [], pollData);
      if (mediaError) return rejectWithValue(`Пост ${i + 1}: ${mediaError}`);
      const buttonsError = validateInlineButtons(snapshot.buttonRows || [], snapshot.inlineButtonsOpen);
      if (buttonsError) return rejectWithValue(`Пост ${i + 1}: ${buttonsError}`);
      const quizError = validateQuizState(
        snapshot.quizOpen,
        snapshot.quizMode,
        snapshot.quizQuestion,
        snapshot.quizAnswers,
        snapshot.quizCorrectAnswerId
      );
      if (quizError) return rejectWithValue(`Пост ${i + 1}: ${quizError}`);
    }

    dispatch(setIsScheduling(true));

    try {
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
            scheduledDates[i].toISOString()
          ),
          series_id: seriesId,
          series_order: i,
        };

        await apiRequest<PublicationResponse>('/publications', {
          method: 'POST', body: JSON.stringify(request),
        });
      }

      invalidatePublications();
      if (settings.selectedTags && settings.selectedTags.length > 0) {
        invalidateTags();
      }

      dispatch(resetEditor());
      dispatch(clearFiles());
      dispatch(resetInlineButtons());
      dispatch(resetQuiz());
      dispatch(resetSettings());
      dispatch(resetSeries());
      dispatch(resetUi());
      return { success: true, message: `Серия из ${snapshots.length} постов запланирована` };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsScheduling(false));
    }
  }
);
