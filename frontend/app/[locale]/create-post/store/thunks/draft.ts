import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { CreatePostRequest, SeriesResponse, PublicationResponse, PostSnapshot } from '../types';
import { selectPollData, resetQuiz } from '../slices/quiz';
import { setIsSavingDraft, resetUi } from '../slices/ui';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
import { invalidateTags } from '@/store/tags/queries';
import { invalidatePublications } from '@/store/publications/queries';
import { apiRequest } from '@/store/api';
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

    const prevSnap = series.snapshots[series.activeIndex];
    const currentSnapshot: PostSnapshot = {
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
      selectedTags: settings.selectedTags.map((t) => ({ name: t.name, color: t.color })),
      sourcePublicationId: prevSnap?.sourcePublicationId,
      seriesId: prevSnap?.seriesId,
      seriesOrder: prevSnap?.seriesOrder,
    };

    const snapshots = [...series.snapshots];
    snapshots[series.activeIndex] = currentSnapshot;

    const isMulti = snapshots.length >= 2;
    const editingExistingSeries = isMulti && snapshots.every((s) => s.sourcePublicationId != null);

    if (!isMulti) {
      const pollData = selectPollData(quiz);
      const plainText = extractPlainText(editor.text);
      if (!plainText && media.files.length === 0 && !pollData) {
        return rejectWithValue('Текст поста или медиа не могут быть пустыми');
      }
    }

    dispatch(setIsSavingDraft(true));

    try {
      if (editingExistingSeries) {
        for (let i = 0; i < snapshots.length; i++) {
          const snapshot = snapshots[i];
          const pubId = snapshot.sourcePublicationId;
          if (pubId == null) continue;

          const pollData = snapshot.quizOpen ? {
            question: snapshot.quizQuestion,
            options: snapshot.quizAnswers.map((a) => a.text).filter((t) => t.trim()),
            is_quiz: snapshot.quizMode === 'quiz',
            allows_multiple_answers: snapshot.quizMode === 'poll_multi',
            correct_option_id: snapshot.quizMode === 'quiz'
              ? snapshot.quizAnswers.findIndex((a) => a.id === snapshot.quizCorrectAnswerId)
              : null,
          } : null;

          const mediaPayload = await prepareMediaPayload(snapshot.mediaFiles || []);
          const request: CreatePostRequest = {
            ...buildCreatePostRequest(
              snapshot.text,
              snapshot.showLinkPreview,
              settings,
              snapshot.buttonRows || [],
              mediaPayload,
              pollData,
              channelIds,
              undefined,
              snapshot.selectedTags ?? null,
            ),
            series_id: snapshot.seriesId,
            series_order: snapshot.seriesOrder ?? i,
          };

          await apiRequest(`/publications/${pubId}`, {
            method: 'PUT',
            body: JSON.stringify(request),
          });
        }
      } else if (isMulti) {
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
            options: snapshot.quizAnswers.map((a) => a.text).filter((t) => t.trim()),
            is_quiz: snapshot.quizMode === 'quiz',
            allows_multiple_answers: snapshot.quizMode === 'poll_multi',
            correct_option_id: snapshot.quizMode === 'quiz'
              ? snapshot.quizAnswers.findIndex((a) => a.id === snapshot.quizCorrectAnswerId)
              : null,
          } : null;

          const mediaPayload = await prepareMediaPayload(snapshot.mediaFiles || []);
          const request: CreatePostRequest = {
            ...buildCreatePostRequest(
              snapshot.text,
              snapshot.showLinkPreview,
              settings,
              snapshot.buttonRows || [],
              mediaPayload,
              pollData,
              channelIds,
              undefined,
              snapshot.selectedTags ?? null,
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
          editor.text,
          editor.showLinkPreview,
          settings,
          inlineButtons.rows,
          mediaPayload,
          pollData,
          channelIds,
          undefined,
          currentSnapshot.selectedTags ?? null,
        );

        const idToUpdate = draftId || (snapshots[0]?.sourcePublicationId != null
          ? String(snapshots[0].sourcePublicationId)
          : null);

        if (idToUpdate) {
          await apiRequest(`/publications/${idToUpdate}`, { method: 'PUT', body: JSON.stringify(request) });
        } else {
          await apiRequest('/publications', { method: 'POST', body: JSON.stringify(request) });
        }
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
      return {
        success: true,
        message: isMulti ? 'Серия сохранена в черновики!' : 'Черновик сохранён!',
      };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsSavingDraft(false));
    }
  }
);
