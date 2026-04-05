import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { selectPollData } from '../slices/quiz';
import { apiRequest } from './api';
import {
  prepareMediaPayload,
  buildCreatePostRequest,
  validatePost,
  validateTelegramMediaRules,
  validateInlineButtons,
  validateQuizState,
} from './utils';

interface UpdatePostParams {
  postId: number;
  channelIds: number[];
  scheduledDate: Date;
}

export const updatePost = createAsyncThunk(
  'createPost/updatePost',
  async (
    { postId, channelIds, scheduledDate }: UpdatePostParams,
    { getState, rejectWithValue },
  ) => {
    const state = getState() as RootState;
    const { editor, media, settings, inlineButtons, quiz } = state;
    const pollData = selectPollData(quiz);

    const error = validatePost(editor.text, media.files.length, pollData, channelIds);
    if (error) return rejectWithValue(error);
    const mediaError = validateTelegramMediaRules(editor.text, media.files, pollData);
    if (mediaError) return rejectWithValue(mediaError);
    const buttonsError = validateInlineButtons(inlineButtons.rows, inlineButtons.isOpen);
    if (buttonsError) return rejectWithValue(buttonsError);
    const quizError = validateQuizState(
      quiz.isOpen, quiz.mode, quiz.question, quiz.answers, quiz.correctAnswerId,
    );
    if (quizError) return rejectWithValue(quizError);

    try {
      const mediaPayload = await prepareMediaPayload(media.files);
      const request = buildCreatePostRequest(
        editor.text,
        editor.showLinkPreview,
        settings,
        inlineButtons.rows,
        mediaPayload,
        pollData,
        channelIds,
        scheduledDate.toISOString(),
      );

      await apiRequest(`/publications/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(request),
      });

      return { success: true };
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Ошибка сохранения поста',
      );
    }
  },
);

export const moveToDraft = createAsyncThunk(
  'createPost/moveToDraft',
  async (postId: number, { rejectWithValue }) => {
    try {
      await apiRequest(`/publications/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'draft', scheduled_time: null }),
      });
      return { success: true };
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : 'Ошибка перемещения в черновики',
      );
    }
  },
);
