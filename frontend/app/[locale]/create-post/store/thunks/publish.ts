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
import { invalidateTags } from '@/store/tags/queries';
import { invalidatePublications } from '@/store/publications/queries';
import { apiRequest } from '@/store/api';
import { prepareMediaPayload, buildCreatePostRequest, validatePost, validateTelegramMediaRules, validateInlineButtons, validateQuizState } from './utils';
import { createAdRevenue } from '@/store/wallet';
import type { AdToggleValue } from '@/components/ad-toggle-section';

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

      await maybeCreateAdRevenue(settings.ad, createResponse.id);

      await apiRequest(`/publications/${createResponse.id}/publish`, { method: 'POST' });

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
      return { success: true, message: 'OK — публикация поставлена в очередь' };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsPublishing(false));
    }
  }
);
