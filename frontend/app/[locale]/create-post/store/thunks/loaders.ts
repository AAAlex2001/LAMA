import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../index';
import { apiRequest, API_BASE_URL } from './api';
import type { MediaFile, ButtonRow, QuizAnswer, Draft, InlineButton } from '../types';
import { setText } from '../slices/editor';
import { setFiles, clearFiles, updateFile } from '../slices/media';
import { setRows, openInlineButtons, resetInlineButtons } from '../slices/inlineButtons';
import { setMode, setQuestion, setAnswers, setCorrectAnswer, openQuiz, resetQuiz } from '../slices/quiz';
import { setChannels as setChannelSelections } from '../slices/channels';
import { addTag, clearTags } from '../slices/settings';
import { fetchChannelsThunk } from './channels';
import { fetchTagsThunk } from './tags';
import type { TagColor } from '../types';
import { TAG_COLORS } from '@/components/dropdown/types';

export const loadChannels = createAsyncThunk(
  'createPost/loadChannels',
  async (_, { dispatch }) => {
    return dispatch(fetchChannelsThunk({}));
  }
);

export const loadRecentTags = createAsyncThunk(
  'createPost/loadRecentTags',
  async (_, { dispatch }) => {
    return dispatch(fetchTagsThunk({}));
  }
);

export const loadDraftById = createAsyncThunk(
  'createPost/loadDraftById',
  async (draftId: number, { dispatch, getState, rejectWithValue }) => {
    try {
      const draft = await apiRequest<Draft>(`/publications/${draftId}`);
      loadDraftIntoStore(draft, dispatch as AppDispatch);

      const state = getState() as RootState;
      const channelIds = new Set((draft.channels || []).map((ch) => ch.id));
      if (state.channels.channels.length > 0) {
        const next = state.channels.channels.map((ch) => ({
          ...ch,
          selected: channelIds.size > 0 ? channelIds.has(ch.id) : false,
        }));
        dispatch(setChannelSelections(next));
      }

      return draft;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновика');
    }
  }
);

export const loadDraftByToken = createAsyncThunk(
  'createPost/loadDraftByToken',
  async (token: string, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/publications/shared/${token}`);
      if (response.status === 404) {
        return rejectWithValue('Ссылка недействительна, истекла или уже была использована');
      }
      if (!response.ok) {
        return rejectWithValue('Не удалось загрузить черновик по ссылке');
      }
      const draft = await response.json() as Draft;
      
      loadDraftIntoStore(draft, dispatch as AppDispatch);

      const state = getState() as RootState;
      const channelIds = new Set((draft.channels || []).map((ch) => ch.id));
      if (state.channels.channels.length > 0) {
        const next = state.channels.channels.map((ch) => ({
          ...ch,
          selected: channelIds.size > 0 ? channelIds.has(ch.id) : false,
        }));
        dispatch(setChannelSelections(next));
      }

      return draft;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки черновика');
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
      const lowerUrl = url.toLowerCase();
      const isVideo = lowerUrl.includes('/videos/') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mov') || lowerUrl.endsWith('.mkv');
      const isDocument =
        lowerUrl.endsWith('.pdf') ||
        lowerUrl.endsWith('.doc') ||
        lowerUrl.endsWith('.docx') ||
        lowerUrl.endsWith('.txt') ||
        lowerUrl.endsWith('.xls') ||
        lowerUrl.endsWith('.xlsx') ||
        lowerUrl.endsWith('.ppt') ||
        lowerUrl.endsWith('.pptx') ||
        lowerUrl.endsWith('.rtf') ||
        lowerUrl.endsWith('.csv');

      return {
        id: `media-${Date.now()}-${index}`,
        url: fullUrl,
        preview_url: isVideo ? (fullThumb || '') : isDocument ? undefined : fullUrl,
        thumbnail_url: fullThumb,
        type: isDocument ? 'document' : isVideo ? 'video' : 'image',
        blur: draft.media_blur?.[index] || false,
        telegram_file_id: draft.media_file_ids?.[index] || null,
      } as MediaFile;
    });
    dispatch(setFiles(mediaFiles));

    const docsToMeasure = mediaFiles.filter(m => m.type === 'document' && !m.size && m.url);
    if (docsToMeasure.length > 0) {
      const fetchContentLength = async (url: string): Promise<number | null> => {
        try {
          const head = await fetch(url, { method: 'HEAD' });
          const length = head.headers.get('content-length');
          if (length) return Number(length);
        } catch {
          // fall through
        }
        try {
          const range = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
          const contentRange = range.headers.get('content-range');
          if (contentRange) {
            const total = contentRange.split('/')[1];
            if (total) return Number(total);
          }
          const length = range.headers.get('content-length');
          if (length) return Number(length);
        } catch {
          // ignore
        }
        return null;
      };

      void Promise.all(
        docsToMeasure.map(async (doc) => {
          const size = await fetchContentLength(doc.url as string);
          if (size) {
            dispatch(updateFile({ id: doc.id, updates: { size } }));
          }
        })
      );
    }
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
        callback_action: btn.callback_action || undefined,
        callback_response: btn.callback_response || '',
        hidden_text_subscribed: btn.hidden_text_subscribed || '',
        hidden_text_unsubscribed: btn.hidden_text_unsubscribed || '',
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

  // Restore tags
  dispatch(clearTags());
  if (draft.tags && draft.tags.length > 0) {
    for (const tag of draft.tags) {
      const validColor = (tag.color && TAG_COLORS.includes(tag.color as TagColor))
        ? (tag.color as TagColor)
        : '#FAC7C7';
      dispatch(addTag({
        name: tag.name,
        color: validColor,
      }));
    }
  }
}
