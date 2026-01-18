import type { CreatePostRequest, RepeatInterval, AutoDeleteInterval, InlineKeyboard, PollData, ContentType } from './types';
import type { MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';
import { createAndPublishPost, saveDraft, uploadMediaFiles } from './api';

interface PostSettingsFromUI {
  channelIds: number[];
  notifySubscribers: boolean;
  pinPost: boolean;
  tagName: string | null;
  tagColor: string | null;
  repeatInterval: RepeatInterval;
  repeatCustomDays: number;
  repeatCustomHours: number;
  autoDeleteInterval: AutoDeleteInterval;
  autoDeleteCustomDays: number;
  autoDeleteCustomHours: number;
}

// Конвертация AutoDeleteInterval в секунды
function convertAutoDeleteToSeconds(
  interval: AutoDeleteInterval, 
  customDays: number = 0, 
  customHours: number = 0
): number | undefined {
  switch (interval) {
    case 'never':
      return undefined;
    case '24h':
      return 24 * 60 * 60; // 86400 секунд
    case '48h':
      return 48 * 60 * 60; // 172800 секунд
    case '72h':
      return 72 * 60 * 60; // 259200 секунд
    case 'custom':
      // Преобразуем дни и часы в секунды
      const totalSeconds = (customDays * 24 * 60 * 60) + (customHours * 60 * 60);
      return totalSeconds > 0 ? totalSeconds : undefined;
    default:
      return undefined;
  }
}

export async function handlePublishNow(
  content: { text: string },
  settings: PostSettingsFromUI,
  mediaFiles: MediaFile[] = [],
  inlineKeyboard?: InlineKeyboard,
  pollData?: PollData | null,
  pollFormOpen?: boolean,
  showLinkPreview?: boolean
) {
  try {
    const plainText = content.text
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    const hasText = plainText.length > 0;
    const hasMedia = mediaFiles.length > 0;
    const hasInlineKeyboard = !!(inlineKeyboard && inlineKeyboard.buttons && inlineKeyboard.buttons.length > 0);
    const hasPoll = !!pollData;

    if (pollFormOpen && !hasPoll) {
      throw new Error('Заполните опрос/викторину или выключите её');
    }

    if (!hasText && !hasMedia && !hasPoll) {
      throw new Error('Текст поста или медиа файлы не могут быть пустыми');
    }

    if (settings.channelIds.length === 0) {
      throw new Error('Выберите хотя бы один канал для публикации');
    }

    const autoDeleteSeconds = convertAutoDeleteToSeconds(
      settings.autoDeleteInterval,
      settings.autoDeleteCustomDays,
      settings.autoDeleteCustomHours
    );

    // Определяем content_type
    let contentType: ContentType = 'text';
    let mediaUrls: string[] = [];
    let mediaFileIds: string[] | undefined;
    let mediaThumbnailUrls: (string | null)[] | undefined;
    // Собираем массив blur-состояний для каждого файла
    const mediaBlurArray = mediaFiles.map(f => f.blur || false);
    
    if (hasMedia) {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';

      const filesToUpload = mediaFiles.filter(f => f.file);
      let uploadedUrls: string[] = [];
      let uploadedFileIds: Array<string | undefined> = [];
      let uploadedThumbnailUrls: Array<string | null> = [];

      if (filesToUpload.length > 0) {
        try {
          const uploadResponse = await uploadMediaFiles(filesToUpload.map(f => f.file as File));

          uploadedUrls = uploadResponse.files.map(f => {
            if (f.url.startsWith('http://') || f.url.startsWith('https://')) {
              return f.url;
            }
            return `${baseUrl}${f.url}`;
          });

          uploadedFileIds = (uploadResponse.file_ids || []).map(id => id || undefined);
          uploadedThumbnailUrls = (uploadResponse.thumbnail_urls || []).map(url => url || null);
        } catch (error) {
          console.error('Failed to upload media:', error);
          throw new Error('Не удалось загрузить медиа файлы');
        }
      }

      const finalUrls: string[] = [];
      const finalFileIds: Array<string | null> = [];
      const finalThumbnailUrls: Array<string | null> = [];
      let uploadIndex = 0;

      for (const f of mediaFiles) {
        if (f.file) {
          const url = uploadedUrls[uploadIndex];
          if (url) {
            finalUrls.push(url);
            finalFileIds.push(uploadedFileIds[uploadIndex] ?? null);
            finalThumbnailUrls.push(uploadedThumbnailUrls[uploadIndex] ?? null);
          }
          uploadIndex += 1;
        } else if (f.url) {
          finalUrls.push(f.url);
          finalFileIds.push(f.telegram_file_id ?? null);
          finalThumbnailUrls.push(f.thumbnail_url ?? null);
        }
      }

      mediaUrls = finalUrls;
      mediaFileIds = finalUrls.length > 0 ? (finalFileIds as unknown as string[]) : undefined;
      mediaThumbnailUrls = finalUrls.length > 0 ? finalThumbnailUrls : undefined;
      contentType = 'text_with_media';
    }

    // Если контента кроме опроса нет — публикуем как poll/quiz
    if (!hasText && !hasMedia && hasPoll) {
      contentType = pollData?.is_quiz ? 'quiz' : 'poll';
    }

    const hasFormatting = hasText && /<\/?(?:a|b|i|s|u|code|pre|tg-spoiler)>/i.test(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    const request: CreatePostRequest = {
      content_type: contentType,
      text_content: hasText ? content.text : undefined,
      formatted_content: formattedContent,
      media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      media_thumbnail_urls: mediaThumbnailUrls,
      media_file_ids: mediaFileIds,
      media_blur: mediaUrls.length > 0 ? mediaBlurArray : undefined,
      channel_ids: settings.channelIds,
      pin_message: settings.pinPost,
      disable_notification: !settings.notifySubscribers,
      disable_web_page_preview: !showLinkPreview,
      status: 'draft',
      inline_keyboard: inlineKeyboard,
      poll_data: hasPoll ? (pollData as PollData) : undefined,
      tag_names: settings.tagName ? [settings.tagName] : undefined,
      tag_color: settings.tagColor || undefined,
      repeat_interval: settings.repeatInterval,
      repeat_custom_days: settings.repeatInterval === 'custom' ? settings.repeatCustomDays : undefined,
      repeat_custom_hours: settings.repeatInterval === 'custom' ? settings.repeatCustomHours : undefined,
      auto_delete_delay_seconds: autoDeleteSeconds,
    };

    const response = await createAndPublishPost(request);

    if (response.success || response.id) {
      return {
        success: true,
        message: 'Пост успешно опубликован!',
        postId: response.postId || response.id,
      };
    } else {
      return {
        success: false,
        message: response.message || 'Не удалось опубликовать пост',
        errors: response.errors,
      };
    }
  } catch (error) {
    console.error('Ошибка при публикации поста:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}

export async function handleSaveDraft(
  content: { text: string },
  settings: PostSettingsFromUI,
  mediaFiles: MediaFile[] = [],
  inlineKeyboard?: InlineKeyboard,
  pollData?: PollData | null,
  pollFormOpen?: boolean,
  showLinkPreview?: boolean
) {
  try {
    const plainText = content.text
      .replace(/<br\s*\/??\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    const hasText = plainText.length > 0;
    const hasMedia = mediaFiles.length > 0;
    const hasPoll = !!pollData;

    if (pollFormOpen && !hasPoll) {
      throw new Error('Заполните опрос/викторину или выключите её');
    }

    if (!hasText && !hasMedia && !hasPoll) {
      throw new Error('Текст поста или медиа файлы не могут быть пустыми');
    }

    // Определяем content_type в зависимости от медиа/опроса
    let contentType: ContentType = 'text';
    let mediaUrls: string[] = [];
    let mediaFileIds: string[] | undefined;
    let mediaThumbnailUrls: (string | null)[] | undefined;
    // Собираем массив blur-состояний для каждого файла
    const mediaBlurArray = mediaFiles.map(f => f.blur || false);
    
    if (mediaFiles.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';

      const filesToUpload = mediaFiles.filter(f => f.file);
      let uploadedUrls: string[] = [];
      let uploadedFileIds: Array<string | undefined> = [];
      let uploadedThumbnailUrls: Array<string | null> = [];

      if (filesToUpload.length > 0) {
        try {
          const uploadResponse = await uploadMediaFiles(filesToUpload.map(f => f.file as File));
          uploadedUrls = uploadResponse.files.map(f => {
            if (f.url.startsWith('http://') || f.url.startsWith('https://')) {
              return f.url;
            }
            return `${baseUrl}${f.url}`;
          });
          uploadedFileIds = (uploadResponse.file_ids || []).map(id => id || undefined);
          uploadedThumbnailUrls = (uploadResponse.thumbnail_urls || []).map(url => url || null);
        } catch (error) {
          console.error('Failed to upload media:', error);
          throw new Error('Не удалось загрузить медиа файлы');
        }
      }

      const finalUrls: string[] = [];
      const finalFileIds: Array<string | null> = [];
      const finalThumbnailUrls: Array<string | null> = [];
      let uploadIndex = 0;

      for (const f of mediaFiles) {
        if (f.file) {
          const url = uploadedUrls[uploadIndex];
          if (url) {
            finalUrls.push(url);
            finalFileIds.push(uploadedFileIds[uploadIndex] ?? null);
            finalThumbnailUrls.push(uploadedThumbnailUrls[uploadIndex] ?? null);
          }
          uploadIndex += 1;
        } else if (f.url) {
          finalUrls.push(f.url);
          finalFileIds.push(f.telegram_file_id ?? null);
          finalThumbnailUrls.push(f.thumbnail_url ?? null);
        }
      }

      mediaUrls = finalUrls;
      mediaFileIds = finalUrls.length > 0 ? (finalFileIds as unknown as string[]) : undefined;
      mediaThumbnailUrls = finalUrls.length > 0 ? finalThumbnailUrls : undefined;
      contentType = 'text_with_media';
    }

    // Если контента кроме опроса нет — сохраняем как poll/quiz
    if (!hasText && !hasMedia && hasPoll) {
      contentType = pollData?.is_quiz ? 'quiz' : 'poll';
    }

    const hasFormatting = hasText && /<\/?(?:a|b|i|s|u|code|pre|tg-spoiler)>/i.test(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    const request: CreatePostRequest = {
      content_type: contentType,
      text_content: hasText ? content.text : undefined,
      formatted_content: formattedContent,
      media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      media_thumbnail_urls: mediaThumbnailUrls,
      media_file_ids: mediaFileIds,
      media_blur: mediaUrls.length > 0 ? mediaBlurArray : undefined,
      channel_ids: settings.channelIds,
      pin_message: settings.pinPost,
      disable_notification: !settings.notifySubscribers,
      disable_web_page_preview: !showLinkPreview,
      status: 'draft',
      inline_keyboard: inlineKeyboard,
      poll_data: hasPoll ? (pollData as PollData) : undefined,
      tag_names: settings.tagName ? [settings.tagName] : undefined,
      tag_color: settings.tagColor || undefined,
      repeat_interval: settings.repeatInterval,
      repeat_custom_days: settings.repeatInterval === 'custom' ? settings.repeatCustomDays : undefined,
      repeat_custom_hours: settings.repeatInterval === 'custom' ? settings.repeatCustomHours : undefined,
      auto_delete_interval: settings.autoDeleteInterval,
    };

    const response = await saveDraft(request);

    if (response.success || response.id) {
      return {
        success: true,
        message: 'Черновик сохранён!',
        postId: response.postId || response.id,
      };
    } else {
      return {
        success: false,
        message: response.message || 'Не удалось сохранить черновик',
        errors: response.errors,
      };
    }
  } catch (error) {
    console.error('Ошибка при сохранении черновика:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}
