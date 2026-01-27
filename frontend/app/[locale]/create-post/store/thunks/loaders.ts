import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch } from '../index';
import { apiRequest, API_BASE_URL } from './api';
import type { MediaFile, ButtonRow, QuizAnswer, ChannelsResponse, Channel, TagsResponse, Draft, InlineButton } from '../types';
import { setText } from '../slices/editor';
import { setFiles, clearFiles } from '../slices/media';
import { setRows, openInlineButtons, resetInlineButtons } from '../slices/inlineButtons';
import { setMode, setQuestion, setAnswers, setCorrectAnswer, openQuiz, resetQuiz } from '../slices/quiz';

export const loadChannels = createAsyncThunk(
  'createPost/loadChannels',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest<ChannelsResponse | Channel[]>('/channels');
      const items = Array.isArray(response) ? response : (response.items || []);
      return items.map((ch: Channel) => ({
        id: String(ch.id),
        label: ch.title,
        checked: ch.selected || false,
        members_count: ch.members_count,
        photo_url: ch.photo_url,
      }));
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки каналов');
    }
  }
);

export const loadRecentTags = createAsyncThunk(
  'createPost/loadRecentTags',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiRequest<TagsResponse>('/tags');
      return response.items || [];
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки тегов');
    }
  }
);

export function loadDraftIntoStore(draft: Draft, dispatch: AppDispatch) {
  const baseUrl = API_BASE_URL.replace('/api', '');
  
  const textContent = draft.formatted_content?.html || draft.formatted_content?.text || draft.text_content || '';
  dispatch(setText(textContent));
  
  if (draft.media_urls && draft.media_urls.length > 0) {
    const mediaFiles: MediaFile[] = draft.media_urls.map((url: string, index: number) => {
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      const thumbUrl = draft.media_thumbnail_urls?.[index];
      const fullThumb = thumbUrl ? (thumbUrl.startsWith('http') ? thumbUrl : `${baseUrl}${thumbUrl}`) : null;
      const isVideo = url.includes('/videos/') || url.endsWith('.mp4') || url.endsWith('.mov');
      return {
        id: `media-${Date.now()}-${index}`,
        url: fullUrl,
        preview_url: fullUrl,
        thumbnail_url: fullThumb,
        type: isVideo ? 'video' : 'image',
        blur: draft.media_blur?.[index] || false,
        telegram_file_id: draft.media_file_ids?.[index] || null,
      } as MediaFile;
    });
    dispatch(setFiles(mediaFiles));
  } else {
    dispatch(clearFiles());
  }
  
  if (draft.inline_keyboard?.buttons && draft.inline_keyboard.buttons.length > 0) {
    const rows: ButtonRow[] = draft.inline_keyboard.buttons.map((row: InlineButton[], ri: number) => ({
      id: `row-${Date.now()}-${ri}`,
      buttons: row.map((btn: InlineButton, bi: number) => ({
        id: `btn-${Date.now()}-${ri}-${bi}`,
        text: btn.text || '',
        type: btn.type || 'url',
        url: btn.url || '',
        callback_data: btn.callback_data || '',
        hidden_text: btn.hidden_text || '',
      })),
    }));
    dispatch(setRows(rows));
    dispatch(openInlineButtons());
  } else {
    dispatch(resetInlineButtons());
  }
  
  if (draft.poll_data) {
    const pd = draft.poll_data;
    dispatch(setQuestion(pd.question || ''));
    const answers: QuizAnswer[] = (pd.options || []).map((opt: string, i: number) => ({
      id: `ans-${Date.now()}-${i}`, text: opt,
    }));
    dispatch(setAnswers(answers));
    dispatch(setMode(pd.is_quiz ? 'quiz' : pd.allows_multiple_answers ? 'poll_multi' : 'poll_single'));
    if (pd.is_quiz && pd.correct_option_id != null && answers[pd.correct_option_id]) {
      dispatch(setCorrectAnswer(answers[pd.correct_option_id].id));
    }
    dispatch(openQuiz());
  } else {
    dispatch(resetQuiz());
  }
}
