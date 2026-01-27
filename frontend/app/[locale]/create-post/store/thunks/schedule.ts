import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { selectPollData, resetQuiz } from '../slices/quiz';
import { setIsScheduling, resetUi } from '../slices/ui';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
import { apiRequest } from './api';
import { prepareMediaPayload, buildCreatePostRequest, validatePost, validateTelegramMediaRules, validateInlineButtons, validateQuizState } from './utils';

export const schedulePost = createAsyncThunk(
  'createPost/schedulePost',
  async ({ channelIds, scheduledDate }: { channelIds: number[]; scheduledDate: Date }, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const { editor, media, settings, inlineButtons, quiz } = state;
    const pollData = selectPollData(quiz);
    
    const error = validatePost(editor.text, media.files.length, pollData, channelIds);
    if (error) return rejectWithValue(error);
    const mediaError = validateTelegramMediaRules(editor.text, media.files, pollData);
    if (mediaError) return rejectWithValue(mediaError);
    const buttonsError = validateInlineButtons(inlineButtons.rows, inlineButtons.isOpen);
    if (buttonsError) return rejectWithValue(buttonsError);
    const quizError = validateQuizState(quiz.isOpen, quiz.mode, quiz.question, quiz.answers, quiz.correctAnswerId);
    if (quizError) return rejectWithValue(quizError);
    
    dispatch(setIsScheduling(true));
    
    try {
      const mediaPayload = await prepareMediaPayload(media.files);
      const request = buildCreatePostRequest(
        editor.text, editor.showLinkPreview, settings, inlineButtons.rows,
        mediaPayload, pollData, channelIds, scheduledDate.toISOString()
      );
      
      await apiRequest('/publications', { method: 'POST', body: JSON.stringify(request) });
      
      dispatch(resetEditor());
      dispatch(clearFiles());
      dispatch(resetInlineButtons());
      dispatch(resetQuiz());
      dispatch(resetSettings());
      dispatch(resetSeries());
      dispatch(resetUi());
      return { success: true, message: 'Пост успешно запланирован' };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsScheduling(false));
    }
  }
);
