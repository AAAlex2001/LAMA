import type { RootState } from '../index';
import type { InlineKeyboard, CreatePostRequest, PollData, MediaFile, ButtonRow, SettingsState, UploadedFile, QuizAnswer, QuizMode } from '../types';
import { uploadMediaFile, API_BASE_URL } from './api';

export function extractPlainText(html: string): string {
  return (html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function hasSupportedFormatting(html: string): boolean {
  return /<\/?(?:a|b|i|s|u|code|pre|tg-spoiler)>/i.test(html || '');
}

export function buildInlineKeyboard(rows: ButtonRow[]): InlineKeyboard | undefined {
  const buttons = rows
    .map(row => row.buttons.filter(btn => btn.text?.trim()).map(btn => ({
      text: btn.text, type: btn.type, url: btn.url,
      callback_data: btn.callback_data, hidden_text: btn.hidden_text,
    })))
    .filter(row => row.length > 0);
  return buttons.length > 0 ? { buttons } : undefined;
}

export function convertAutoDeleteToSeconds(interval: string, customDays: number, customHours: number): number | undefined {
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

export async function prepareMediaPayload(files: MediaFile[]) {
  if (files.length === 0) return { mediaUrls: [], mediaFileIds: undefined, mediaThumbnailUrls: undefined, mediaBlurArray: [] };
  
  const baseUrl = API_BASE_URL.replace('/api', '') || 'http://localhost:8000';
  const mediaBlurArray = files.map(f => f.blur || false);
  
  const filesToUpload = files.filter(f => f.file);
  const uploadedFiles: UploadedFile[] = [];
  for (const mediaFile of filesToUpload) {
    if (mediaFile.file) uploadedFiles.push(await uploadMediaFile(mediaFile.file));
  }
  
  const mediaUrls: string[] = [];
  const mediaFileIds: (string | null)[] = [];
  const mediaThumbnailUrls: (string | null)[] = [];
  
  let uploadIndex = 0;
  for (const mediaFile of files) {
    if (mediaFile.file) {
      const uploaded = uploadedFiles[uploadIndex++];
      if (uploaded) {
        mediaUrls.push(uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`);
        mediaFileIds.push(uploaded.file_id || null);
        mediaThumbnailUrls.push(uploaded.thumbnailUrl || null);
      }
    } else if (mediaFile.url) {
      mediaUrls.push(mediaFile.url);
      mediaFileIds.push(mediaFile.telegram_file_id || null);
      mediaThumbnailUrls.push(mediaFile.thumbnail_url || null);
    }
  }
  
  return { mediaUrls, mediaFileIds, mediaThumbnailUrls, mediaBlurArray };
}

export function buildCreatePostRequest(
  text: string, showLinkPreview: boolean, settings: SettingsState, buttonRows: ButtonRow[],
  mediaPayload: Awaited<ReturnType<typeof prepareMediaPayload>>,
  pollData: PollData | null, channelIds: number[], scheduledTime?: string
): CreatePostRequest {
  const plainText = extractPlainText(text);
  const hasText = plainText.length > 0;
  const hasMedia = mediaPayload.mediaUrls.length > 0;
  const hasPoll = !!pollData;
  
  let contentType: 'text' | 'text_with_media' | 'poll' | 'quiz' = 'text';
  if (hasMedia) contentType = 'text_with_media';
  else if (!hasText && hasPoll) contentType = pollData?.is_quiz ? 'quiz' : 'poll';
  
  const hasFormatting = hasText && hasSupportedFormatting(text);
  const autoDeleteSeconds = convertAutoDeleteToSeconds(settings.autoDeleteInterval, settings.autoDeleteCustomDays, settings.autoDeleteCustomHours);
  
  return {
    content_type: contentType,
    text_content: hasText ? text : undefined,
    formatted_content: hasFormatting ? { text, parse_mode: 'HTML' } : undefined,
    media_urls: mediaPayload.mediaUrls.length > 0 ? mediaPayload.mediaUrls : undefined,
    media_thumbnail_urls: mediaPayload.mediaThumbnailUrls,
    media_file_ids: mediaPayload.mediaFileIds ?? undefined,
    media_blur: mediaPayload.mediaUrls.length > 0 ? mediaPayload.mediaBlurArray : undefined,
    channel_ids: channelIds,
    pin_message: settings.pinPost,
    disable_notification: !settings.notifySubscribers,
    disable_web_page_preview: !showLinkPreview,
    status: scheduledTime ? 'scheduled' : 'draft',
    scheduled_time: scheduledTime || new Date().toISOString(),
    inline_keyboard: buildInlineKeyboard(buttonRows),
    poll_data: pollData || undefined,
    tag_names: settings.selectedTagName ? [settings.selectedTagName] : undefined,
    tag_color: settings.selectedTagColor ?? undefined,
    repeat_interval: settings.repeatInterval,
    reply_to_post_id: settings.replyToPostId || undefined,
    auto_delete_delay_seconds: autoDeleteSeconds,
  };
}

export function validatePost(text: string, filesCount: number, pollData: PollData | null, channelIds: number[]): string | null {
  const plainText = extractPlainText(text);
  if (!plainText && filesCount === 0 && !pollData) return 'Текст поста или медиа не могут быть пустыми';
  if (plainText.length > 4096) return 'Превышен лимит 4096 символов';
  if (channelIds.length === 0) return 'Выберите хотя бы один канал';
  return null;
}

export function validateTelegramMediaRules(text: string, files: MediaFile[], pollData: PollData | null): string | null {
  const hasText = extractPlainText(text).length > 0;
  const hasMedia = files.length > 0;
  const hasPoll = !!pollData;

  if (hasPoll && (hasText || hasMedia)) {
    return 'Опросы нельзя публиковать вместе с текстом или медиа';
  }

  const hasDocuments = files.some(f => f.type === 'document');
  const hasVisual = files.some(f => f.type === 'image' || f.type === 'video');
  if (hasDocuments && hasVisual) {
    return 'Документы нельзя публиковать вместе с фото или видео (ограничение Telegram)';
  }

  if (hasMedia) {
    const totalBytes = files.reduce((sum, f) => sum + (f.size ?? f.file?.size ?? 0), 0);
    if (totalBytes > 50 * 1024 * 1024) {
      return 'Суммарный размер медиа не должен превышать 50 МБ (ограничение Telegram)';
    }
  }

  return null;
}

export function validateInlineButtons(rows: ButtonRow[], isOpen: boolean): string | null {
  if (!isOpen) return null;
  const allButtons = rows.flatMap(r => r.buttons);
  if (allButtons.length === 0) return 'Добавьте хотя бы одну кнопку';

  for (const btn of allButtons) {
    const text = btn.text?.trim() || '';
    if (!text) return 'Заполните текст кнопки';

    if (btn.type === 'url') {
      const url = btn.url?.trim() || '';
      if (!url) return 'Заполните ссылку для кнопки';
    }

    if (btn.type === 'callback') {
      const data = btn.callback_data?.trim() || '';
      if (!data) return 'Заполните callback для кнопки';
      if (data.length > 64) return 'Callback для кнопки не должен превышать 64 символа';
    }

    if (btn.type === 'hidden_text') {
      const hidden = btn.hidden_text?.trim() || '';
      if (!hidden) return 'Заполните скрытый текст для кнопки';
    }
  }

  return null;
}

export function validateQuizState(
  isOpen: boolean,
  mode: QuizMode,
  question: string,
  answers: QuizAnswer[],
  correctAnswerId: string | null
): string | null {
  if (!isOpen) return null;
  const q = question.trim();
  if (!q) return 'Заполните вопрос опроса';

  const options = answers.map(a => a.text.trim()).filter(Boolean);
  if (options.length < 2) return 'Добавьте минимум 2 варианта ответа';
  if (options.length > 10) return 'В опросе максимум 10 вариантов ответа';

  if (mode === 'quiz') {
    if (!correctAnswerId) return 'Выберите правильный ответ для квиза';
    const correctIndex = answers.findIndex(a => a.id === correctAnswerId);
    if (correctIndex < 0 || !answers[correctIndex]?.text.trim()) {
      return 'Правильный ответ должен быть заполнен';
    }
  }

  return null;
}
