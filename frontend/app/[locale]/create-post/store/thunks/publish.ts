import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { CreatePostResponse } from '../types';
import { selectPollData } from '../slices/quiz';
import { setIsPublishing, resetUi } from '../slices/ui';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetQuiz } from '../slices/quiz';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
import { resetTags } from '../slices/tags';
import { resetReplyToPost } from '../slices/replyToPost';
import { fetchTagsThunk } from './tags';
import { apiRequest } from './api';
import { prepareMediaPayload, buildCreatePostRequest, validatePost, validateTelegramMediaRules, validateInlineButtons, validateQuizState } from './utils';

export const publishNow = createAsyncThunk(
  'createPost/publishNow',
  async (channelIds: number[], { getState, dispatch, rejectWithValue }) => {
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
    
    dispatch(setIsPublishing(true));
    
    try {
      const mediaPayload = await prepareMediaPayload(media.files);
      const request = buildCreatePostRequest(
        editor.text, editor.showLinkPreview, settings, inlineButtons.rows,
        mediaPayload, pollData, channelIds
      );
      
      const createResponse = await apiRequest<CreatePostResponse>('/publications', {
        method: 'POST', body: JSON.stringify(request),
      });
      
      if (!createResponse.id) return rejectWithValue('Не удалось создать пост');
      
      await apiRequest(`/publications/${createResponse.id}/publish`, { method: 'POST' });
      
      // Если был создан новый тег, перезагружаем список тегов
      if (settings.selectedTagName && settings.selectedTagName.trim()) {
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
      return { success: true, message: 'OK — публикация поставлена в очередь' };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsPublishing(false));
    }
  }
);
