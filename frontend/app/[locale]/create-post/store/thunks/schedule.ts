import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { selectPollData, resetQuiz } from '../slices/quiz';
import { setIsScheduling, resetUi } from '../slices/ui';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
import { resetTags } from '../slices/tags';
import { resetReplyToPost } from '../slices/replyToPost';
import { fetchTagsThunk } from './tags';
import { apiRequest } from './api';
import { prepareMediaPayload, buildCreatePostRequest, validatePost, validateTelegramMediaRules, validateInlineButtons, validateQuizState } from './utils';
import { createAdRevenue } from '../../../wallet/store/api';
import type { AdToggleValue } from '@/components/ad-toggle-section';
import type { CreatePostResponse } from '../types';

async function maybeCreateAdRevenue(ad: AdToggleValue, publicationId: number): Promise<void> {
  if (!ad?.enabled || !ad.amount || Number(ad.amount) <= 0) return;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  try {
    await createAdRevenue({
      type: 'income',
      buyer: ad.buyer || null,
      amount: ad.amount,
      currency: ad.currency || 'RUB',
      revenue_date: iso,
      note: ad.note || null,
      publication_id: publicationId,
    });
  } catch (e) {
    console.warn('Failed to create ad revenue', e);
  }
}

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
      
      const createResponse = await apiRequest<CreatePostResponse>('/publications', {
        method: 'POST', body: JSON.stringify(request),
      });
      if (createResponse.id) {
        await maybeCreateAdRevenue(settings.ad, createResponse.id);
      }
      
      // Если были теги, перезагружаем список тегов
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
      return { success: true, message: 'Пост успешно запланирован' };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsScheduling(false));
    }
  }
);
