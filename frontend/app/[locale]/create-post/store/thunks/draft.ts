import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { selectPollData, resetQuiz } from '../slices/quiz';
import { setIsSavingDraft, resetUi } from '../slices/ui';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
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
    const { editor, media, settings, inlineButtons, quiz } = state;
    const pollData = selectPollData(quiz);
    
    const plainText = extractPlainText(editor.text);
    if (!plainText && media.files.length === 0 && !pollData) {
      return rejectWithValue('Текст поста или медиа не могут быть пустыми');
    }
    
    dispatch(setIsSavingDraft(true));
    
    try {
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
      
      dispatch(resetEditor());
      dispatch(clearFiles());
      dispatch(resetInlineButtons());
      dispatch(resetQuiz());
      dispatch(resetSettings());
      dispatch(resetSeries());
      dispatch(resetUi());
      return { success: true, message: 'Черновик сохранён!' };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsSavingDraft(false));
    }
  }
);
