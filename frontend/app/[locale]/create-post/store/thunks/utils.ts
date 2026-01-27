import type { RootState } from '../index';
import type { InlineKeyboard, CreatePostRequest, PollData, MediaFile, ButtonRow, SettingsState, UploadedFile } from '../types';
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
