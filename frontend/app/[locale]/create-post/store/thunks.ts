import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { CreatePostRequest, InlineKeyboard, PollData, PostSnapshot, MediaFile, ButtonRow, QuizAnswer } from './types';
import { selectPollData, setMode, setQuestion, setAnswers, setCorrectAnswer, openQuiz } from './slices/quiz';
import {
  setIsPublishing,
  setIsSavingDraft,
  setIsScheduling,
  setIsSavingTemplate,
} from './slices/ui';
import { resetEditor, setText } from './slices/editor';
import { clearFiles, setFiles } from './slices/media';
import { resetInlineButtons, setRows, openInlineButtons } from './slices/inlineButtons';
import { resetQuiz } from './slices/quiz';
import { resetSettings } from './slices/settings';
import { resetSeries } from './slices/series';
import { resetUi } from './slices/ui';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

function getAuthToken(): string | null {
  return typeof window !== 'undefined'
    ? localStorage.getItem('lamaplanner_access_token')
    : null;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Ошибка запроса');
  }
  
  return response.json();
}

async function uploadMediaFile(file: File) {
  const url = `${API_BASE_URL}/upload-media`;
  const token = getAuthToken();
  
  const formData = new FormData();
  formData.append('files', file);
  
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Ошибка загрузки ${file.name}`);
  }
  
  const data = await response.json();
  const result = data.files[0];
  if (data.file_ids && data.file_ids.length > 0) {
    result.file_id = data.file_ids[0];
  }
  if (data.thumbnail_urls && data.thumbnail_urls.length > 0) {
    result.thumbnailUrl = data.thumbnail_urls[0];
  }
  return result;
}

function extractPlainText(html: string): string {
  return (html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function hasSupportedFormatting(html: string): boolean {
  return /<\/?(?:a|b|i|s|u|code|pre|tg-spoiler)>/i.test(html || '');
}

function buildInlineKeyboard(state: RootState): InlineKeyboard | undefined {
  const { isOpen, rows } = state.inlineButtons;
  if (!isOpen || rows.length === 0) return undefined;
  
  const buttons = rows
    .map(row =>
      row.buttons
        .filter(btn => btn.text && btn.text.trim())
        .map(btn => ({
          text: btn.text,
          type: btn.type,
          url: btn.url,
          callback_data: btn.callback_data,
          hidden_text: btn.hidden_text,
        }))
    )
    .filter(row => row.length > 0);
  
  return buttons.length > 0 ? { buttons } : undefined;
}

function convertAutoDeleteToSeconds(
  interval: string,
  customDays: number,
  customHours: number
): number | undefined {
  switch (interval) {
    case '24h': return 24 * 60 * 60;
    case '48h': return 48 * 60 * 60;
    case '72h': return 72 * 60 * 60;
    case 'custom':
      const total = (customDays * 24 * 60 * 60) + (customHours * 60 * 60);
      return total > 0 ? total : undefined;
    default: return undefined;
  }
}

async function prepareMediaPayload(state: RootState) {
  const { files } = state.media;
  if (files.length === 0) return { mediaUrls: [], mediaFileIds: undefined, mediaThumbnailUrls: undefined, mediaBlurArray: [] };
  
  const baseUrl = API_BASE_URL.replace('/api', '') || 'http://localhost:8000';
  const mediaBlurArray = files.map(f => f.blur || false);
  
  const filesToUpload = files.filter(f => f.file);
  const uploadedFiles: any[] = [];
  
  for (const mediaFile of filesToUpload) {
    if (mediaFile.file) {
      const uploaded = await uploadMediaFile(mediaFile.file);
      uploadedFiles.push(uploaded);
    }
  }
  
  const mediaUrls: string[] = [];
  const mediaFileIds: (string | null)[] = [];
  const mediaThumbnailUrls: (string | null)[] = [];
  
  let uploadIndex = 0;
  for (const mediaFile of files) {
    if (mediaFile.file) {
      const uploaded = uploadedFiles[uploadIndex];
      if (uploaded) {
        const url = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
        mediaUrls.push(url);
        mediaFileIds.push(uploaded.file_id || null);
        mediaThumbnailUrls.push(uploaded.thumbnailUrl || null);
      }
      uploadIndex++;
    } else if (mediaFile.url) {
      mediaUrls.push(mediaFile.url);
      mediaFileIds.push(mediaFile.telegram_file_id || null);
      mediaThumbnailUrls.push(mediaFile.thumbnail_url || null);
    }
  }
  
  return { mediaUrls, mediaFileIds, mediaThumbnailUrls, mediaBlurArray };
}

function buildCreatePostRequest(
  state: RootState,
  channelIds: number[],
  mediaPayload: Awaited<ReturnType<typeof prepareMediaPayload>>,
  pollData: PollData | null,
  scheduledTime?: string
): CreatePostRequest {
  const { editor, settings, inlineButtons, quiz } = state;
  const plainText = extractPlainText(editor.text);
  const hasText = plainText.length > 0;
  const hasMedia = mediaPayload.mediaUrls.length > 0;
  const hasPoll = !!pollData;
  
  let contentType: 'text' | 'text_with_media' | 'poll' | 'quiz' = 'text';
  if (hasMedia) contentType = 'text_with_media';
  else if (!hasText && hasPoll) contentType = pollData?.is_quiz ? 'quiz' : 'poll';
  
  const hasFormatting = hasText && hasSupportedFormatting(editor.text);
  
  const autoDeleteSeconds = convertAutoDeleteToSeconds(
    settings.autoDeleteInterval,
    settings.autoDeleteCustomDays,
    settings.autoDeleteCustomHours
  );
  
  return {
    content_type: contentType,
    text_content: hasText ? editor.text : undefined,
    formatted_content: hasFormatting ? { text: editor.text, parse_mode: 'HTML' } : undefined,
    media_urls: mediaPayload.mediaUrls.length > 0 ? mediaPayload.mediaUrls : undefined,
    media_thumbnail_urls: mediaPayload.mediaThumbnailUrls,
    media_file_ids: mediaPayload.mediaFileIds ?? undefined,
    media_blur: mediaPayload.mediaUrls.length > 0 ? mediaPayload.mediaBlurArray : undefined,
    channel_ids: channelIds,
    pin_message: settings.pinPost,
    disable_notification: !settings.notifySubscribers,
    disable_web_page_preview: !editor.showLinkPreview,
    status: scheduledTime ? 'scheduled' : 'draft',
    scheduled_time: scheduledTime || new Date().toISOString(),
    inline_keyboard: buildInlineKeyboard(state),
    poll_data: pollData || undefined,
    tag_names: settings.selectedTagName ? [settings.selectedTagName] : undefined,
    tag_color: settings.selectedTagName ? settings.selectedTagColor : undefined,
    repeat_interval: settings.repeatInterval,
    repeat_custom_days: settings.repeatInterval === 'custom' ? settings.repeatCustomDays : undefined,
    repeat_custom_hours: settings.repeatInterval === 'custom' ? settings.repeatCustomHours : undefined,
    repeat_custom_unit: settings.repeatInterval === 'custom' ? settings.repeatCustomUnit : undefined,
    repeat_custom_value: settings.repeatInterval === 'custom' ? settings.repeatCustomValue : undefined,
    repeat_weekdays: settings.repeatInterval === 'custom' ? settings.repeatWeekdays : undefined,
    repeat_month_days: settings.repeatInterval === 'custom' ? settings.repeatMonthDays : undefined,
    repeat_year_month: settings.repeatInterval === 'custom' ? settings.repeatYearMonth + 1 : undefined,
    repeat_year_days: settings.repeatInterval === 'custom' ? settings.repeatYearDays : undefined,
    repeat_end_time: settings.repeatEndType === 'date' && settings.repeatEndDate ? settings.repeatEndDate : undefined,
    auto_delete_delay_seconds: autoDeleteSeconds,
    reply_to_post_id: settings.replyToPostId || undefined,
  };
}

function validatePost(state: RootState, channelIds: number[]): string | null {
  const { editor, media, quiz } = state;
  const plainText = extractPlainText(editor.text);
  const hasText = plainText.length > 0;
  const hasMedia = media.files.length > 0;
  const pollData = selectPollData(quiz);
  const hasPoll = !!pollData;
  
  if (quiz.isOpen && !hasPoll) {
    return 'Заполните опрос/викторину или выключите её';
  }
  
  if (!hasText && !hasMedia && !hasPoll) {
    return 'Текст поста или медиа файлы не могут быть пустыми';
  }
  
  if (hasText && plainText.length > 4096) {
    return 'Превышен лимит 4096 символов';
  }
  
  if (channelIds.length === 0) {
    return 'Выберите хотя бы один канал для публикации';
  }
  
  return null;
}

export const publishNow = createAsyncThunk(
  'createPost/publishNow',
  async (channelIds: number[], { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    
    const error = validatePost(state, channelIds);
    if (error) return rejectWithValue(error);
    
    dispatch(setIsPublishing(true));
    
    try {
      const pollData = selectPollData(state.quiz);
      const mediaPayload = await prepareMediaPayload(state);
      const request = buildCreatePostRequest(state, channelIds, mediaPayload, pollData);
      
      const createResponse: any = await apiRequest('/publications', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
      if (!createResponse.id) {
        return rejectWithValue('Не удалось создать пост');
      }
      
      await apiRequest(`/publications/${createResponse.id}/publish`, { method: 'POST' });
      
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

export const saveDraft = createAsyncThunk(
  'createPost/saveDraft',
  async (channelIds: number[], { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    
    const { editor, media, quiz } = state;
    const plainText = extractPlainText(editor.text);
    const hasText = plainText.length > 0;
    const hasMedia = media.files.length > 0;
    const pollData = selectPollData(quiz);
    const hasPoll = !!pollData;
    
    if (quiz.isOpen && !hasPoll) {
      return rejectWithValue('Заполните опрос/викторину или выключите её');
    }
    
    if (!hasText && !hasMedia && !hasPoll) {
      return rejectWithValue('Текст поста или медиа файлы не могут быть пустыми');
    }
    
    dispatch(setIsSavingDraft(true));
    
    try {
      const mediaPayload = await prepareMediaPayload(state);
      const request = buildCreatePostRequest(state, channelIds, mediaPayload, pollData);
      
      const response: any = await apiRequest('/publications', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
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

export const schedulePost = createAsyncThunk(
  'createPost/schedulePost',
  async ({ channelIds, scheduledDate }: { channelIds: number[]; scheduledDate: Date }, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    
    const error = validatePost(state, channelIds);
    if (error) return rejectWithValue(error);
    
    dispatch(setIsScheduling(true));
    
    try {
      const pollData = selectPollData(state.quiz);
      const mediaPayload = await prepareMediaPayload(state);
      const request = buildCreatePostRequest(state, channelIds, mediaPayload, pollData, scheduledDate.toISOString());
      
      const response: any = await apiRequest('/publications', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
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

export const saveAsTemplate = createAsyncThunk(
  'createPost/saveAsTemplate',
  async (selectedHtml: string | undefined, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const html = (selectedHtml || state.editor.text || '').trim();
    
    if (!html) {
      return rejectWithValue('Текст шаблона пустой');
    }
    
    dispatch(setIsSavingTemplate(true));
    
    try {
      const name = `Шаблон ${new Date().toLocaleString('ru-RU')}`;
      await apiRequest('/text-templates', {
        method: 'POST',
        body: JSON.stringify({ name, formatted_content: { text: html } }),
      });
      
      return { success: true, message: 'Шаблон сохранён' };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      dispatch(setIsSavingTemplate(false));
    }
  }
);

export const loadChannels = createAsyncThunk(
  'createPost/loadChannels',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response: any = await apiRequest('/channels');
      const channels = (response.items || response || []).map((ch: any) => ({
        id: String(ch.id),
        label: ch.title,
        checked: ch.selected || false,
        members_count: ch.members_count,
        photo_url: ch.photo_url,
      }));
      return channels;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки каналов');
    }
  }
);

export const loadRecentTags = createAsyncThunk(
  'createPost/loadRecentTags',
  async (_, { rejectWithValue }) => {
    try {
      const response: any = await apiRequest('/tags');
      return response.items || [];
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Ошибка загрузки тегов');
    }
  }
);

// Функция для загрузки данных черновика в стор
export function loadDraftIntoStore(draft: any, dispatch: any) {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api').replace('/api', '');
  
  // 1. Загружаем текст (поле может быть html или text)
  const textContent = draft.formatted_content?.html || draft.formatted_content?.text || draft.text_content || '';
  dispatch(setText(textContent));
  
  // 2. Загружаем медиа файлы
  if (draft.media_urls && draft.media_urls.length > 0) {
    const mediaFiles: MediaFile[] = draft.media_urls.map((url: string, index: number) => {
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      const thumbnailUrl = draft.media_thumbnail_urls?.[index];
      const fullThumbnail = thumbnailUrl ? (thumbnailUrl.startsWith('http') ? thumbnailUrl : `${baseUrl}${thumbnailUrl}`) : null;
      const isVideo = url.includes('/videos/') || url.endsWith('.mp4') || url.endsWith('.mov');
      const isDocument = url.includes('/documents/');
      
      return {
        id: `media-${Date.now()}-${index}`,
        url: fullUrl,
        preview_url: fullUrl,
        thumbnail_url: fullThumbnail,
        type: isVideo ? 'video' : isDocument ? 'document' : 'image',
        blur: draft.media_blur?.[index] || false,
        telegram_file_id: draft.media_file_ids?.[index] || null,
      } as MediaFile;
    });
    dispatch(setFiles(mediaFiles));
  } else {
    dispatch(clearFiles());
  }
  
  // 3. Загружаем inline кнопки
  if (draft.inline_keyboard?.buttons && draft.inline_keyboard.buttons.length > 0) {
    const rows: ButtonRow[] = draft.inline_keyboard.buttons.map((row: any[], rowIndex: number) => ({
      id: `row-${Date.now()}-${rowIndex}`,
      buttons: row.map((btn: any, btnIndex: number) => ({
        id: `btn-${Date.now()}-${rowIndex}-${btnIndex}`,
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
  
  // 4. Загружаем опрос/викторину
  if (draft.poll_data) {
    const pollData = draft.poll_data;
    dispatch(setQuestion(pollData.question || ''));
    
    const answers: QuizAnswer[] = (pollData.options || []).map((opt: string, index: number) => ({
      id: `ans-${Date.now()}-${index}`,
      text: opt,
    }));
    dispatch(setAnswers(answers));
    
    if (pollData.is_quiz) {
      dispatch(setMode('quiz'));
      if (pollData.correct_option_id !== null && pollData.correct_option_id !== undefined && answers[pollData.correct_option_id]) {
        dispatch(setCorrectAnswer(answers[pollData.correct_option_id].id));
      }
    } else if (pollData.allows_multiple_answers) {
      dispatch(setMode('poll_multi'));
    } else {
      dispatch(setMode('poll_single'));
    }
    
    dispatch(openQuiz());
  } else {
    dispatch(resetQuiz());
  }
}
