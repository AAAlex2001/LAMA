import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type {
  CreatePostRequest,
  PostSettings,
  PostSnapshot,
  PublicationResponse,
  SeriesResponse,
} from '../types';
import { MIN_SERIES_POSTS } from '../types';
import { setIsPublishing, resetUi } from '../slices/ui';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetQuiz } from '../slices/quiz';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
import { captureSnapshotSettings } from '../snapshotSettings';
import { invalidateTags } from '@/store/tags/queries';
import { invalidatePublications } from '@/store/publications/queries';
import { apiRequest } from '@/store/api';
import {
  buildCreatePostRequest,
  buildPollDataFromSnapshot,
  prepareMediaPayload,
  validateInlineButtons,
  validatePost,
  validateQuizState,
  validateTelegramMediaRules,
} from './utils';

export const publishSeries = createAsyncThunk(
  'createPost/publishSeries',
  async (_: void, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { series, editor, media, inlineButtons, quiz } = state;

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
      settings: captureSnapshotSettings(state),
    };
    const snapshots = [...series.snapshots];
    snapshots[series.activeIndex] = currentSnapshot;

    if (snapshots.length < MIN_SERIES_POSTS) {
      return rejectWithValue(`Серия должна содержать минимум ${MIN_SERIES_POSTS} поста`);
    }

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];
      const channelIds = snapshot.settings?.selectedChannelIds ?? [];
      if (channelIds.length === 0) {
        return rejectWithValue(`Пост ${i + 1}: выберите хотя бы один канал`);
      }
      const pollData = buildPollDataFromSnapshot(snapshot);
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
        snapshot.quizCorrectAnswerId,
      );
      if (quizError) return rejectWithValue(`Пост ${i + 1}: ${quizError}`);
    }

    dispatch(setIsPublishing(true));

    try {
      const seriesResponse = await apiRequest<SeriesResponse>('/publications/series', {
        method: 'POST',
        body: JSON.stringify({
          name: `Серия ${new Date().toLocaleString('ru-RU')}`,
          reply_to_previous: true,
        }),
      });
      const seriesId = seriesResponse.id;
      const createdIds: number[] = [];

      for (let i = 0; i < snapshots.length; i++) {
        const pubId = await createSeriesPost(snapshots[i], i, seriesId);
        createdIds.push(pubId);
      }

      for (const pubId of createdIds) {
        await apiRequest(`/publications/${pubId}/publish`, { method: 'POST' });
      }

      invalidatePublications();
      if (anySnapshotHasTags(snapshots)) invalidateTags();

      dispatch(resetEditor());
      dispatch(clearFiles());
      dispatch(resetInlineButtons());
      dispatch(resetQuiz());
      dispatch(resetSettings());
      dispatch(resetSeries());
      dispatch(resetUi());
      return { success: true, message: `Серия из ${snapshots.length} постов опубликована` };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsPublishing(false));
    }
  },
);

async function createSeriesPost(
  snapshot: PostSnapshot,
  order: number,
  seriesId: number,
): Promise<number> {
  const settings = snapshot.settings as PostSettings;
  const channelIds = settings.selectedChannelIds;
  const pollData = buildPollDataFromSnapshot(snapshot);
  const mediaPayload = await prepareMediaPayload(snapshot.mediaFiles || []);
  const base = buildCreatePostRequest(
    snapshot.text,
    snapshot.showLinkPreview,
    settings,
    snapshot.buttonRows || [],
    mediaPayload,
    pollData,
    channelIds,
  );
  const isFirstInSeries = order === 0;
  const request: CreatePostRequest = {
    ...base,
    series_id: seriesId,
    series_order: order,
    ad_buyer: isFirstInSeries ? base.ad_buyer : null,
    ad_amount: isFirstInSeries ? base.ad_amount : null,
    ad_currency: isFirstInSeries ? base.ad_currency : null,
    ad_note: isFirstInSeries ? base.ad_note : null,
  };

  const pub = await apiRequest<PublicationResponse>('/publications', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return pub.id;
}

function anySnapshotHasTags(snapshots: PostSnapshot[]): boolean {
  return snapshots.some((s) => (s.settings?.selectedTags?.length ?? 0) > 0);
}
