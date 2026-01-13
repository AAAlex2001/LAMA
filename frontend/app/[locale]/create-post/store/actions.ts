import type { CreatePostRequest, RepeatInterval, AutoDeleteInterval, InlineKeyboard } from './types';
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
  inlineKeyboard?: InlineKeyboard
) {
  try {
    if (!content.text.trim() && mediaFiles.length === 0) {
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

    // Определяем content_type в зависимости от медиа
    let contentType: 'text' | 'text_with_media' = 'text';
    let mediaUrls: string[] = [];
    // Собираем массив blur-состояний для каждого файла
    const mediaBlurArray = mediaFiles.map(f => f.blur || false);
    
    // Если есть медиа файлы - загружаем их на сервер
    if (mediaFiles.length > 0) {
      const filesToUpload = mediaFiles
        .filter(f => f.file)
        .map(f => f.file as File);
      
      if (filesToUpload.length > 0) {
        try {
          console.log('Uploading files to server...');
          const uploadResponse = await uploadMediaFiles(filesToUpload);
          console.log('Upload response:', uploadResponse);
          
          // Получаем полные URL-ы (добавляем домен только для локальных путей)
          const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';
          mediaUrls = uploadResponse.files.map(f => {
            // Если URL уже абсолютный (http/https), используем как есть
            if (f.url.startsWith('http://') || f.url.startsWith('https://')) {
              return f.url;
            }
            // Иначе добавляем baseUrl для локальных файлов
            return `${baseUrl}${f.url}`;
          });
          console.log('Media URLs:', mediaUrls);
        } catch (error) {
          console.error('Failed to upload media:', error);
          throw new Error('Не удалось загрузить медиа файлы');
        }
      }
      
      contentType = 'text_with_media';
    }

    // Проверяем, есть ли HTML теги форматирования
    const hasFormatting = /<\/?(?:b|i|s|u|code|pre|tg-spoiler)>/i.test(content.text);
    const hasSpoiler = /<\/?tg-spoiler>/i.test(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    const request: CreatePostRequest = {
      content_type: contentType,
      text_content: content.text || undefined,
      formatted_content: formattedContent,
      media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      media_blur: mediaUrls.length > 0 ? mediaBlurArray : undefined,
      channel_ids: settings.channelIds,
      pin_message: settings.pinPost,
      disable_notification: !settings.notifySubscribers,
      status: 'draft',
      inline_keyboard: inlineKeyboard,
      tag_names: settings.tagName ? [settings.tagName] : undefined,
      tag_color: settings.tagColor || undefined,
      repeat_interval: settings.repeatInterval,
      repeat_custom_days: settings.repeatInterval === 'custom' ? settings.repeatCustomDays : undefined,
      repeat_custom_hours: settings.repeatInterval === 'custom' ? settings.repeatCustomHours : undefined,
      auto_delete_delay_seconds: autoDeleteSeconds,
    };

    console.log('Request to backend:', request);

    const response = await createAndPublishPost(request);
    
    console.log('Response from backend:', response);

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
  inlineKeyboard?: InlineKeyboard
) {
  try {
    if (!content.text.trim() && mediaFiles.length === 0) {
      throw new Error('Текст поста или медиа файлы не могут быть пустыми');
    }

    // Определяем content_type в зависимости от медиа
    let contentType: 'text' | 'text_with_media' = 'text';
    let mediaUrls: string[] = [];
    // Собираем массив blur-состояний для каждого файла
    const mediaBlurArray = mediaFiles.map(f => f.blur || false);
    
    // Если есть медиа файлы - загружаем их на сервер
    if (mediaFiles.length > 0) {
      const filesToUpload = mediaFiles
        .filter(f => f.file)
        .map(f => f.file as File);
      
      if (filesToUpload.length > 0) {
        try {
          const uploadResponse = await uploadMediaFiles(filesToUpload);
          const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';
          mediaUrls = uploadResponse.files.map(f => {
            // Если URL уже абсолютный (http/https), используем как есть
            if (f.url.startsWith('http://') || f.url.startsWith('https://')) {
              return f.url;
            }
            // Иначе добавляем baseUrl для локальных файлов
            return `${baseUrl}${f.url}`;
          });
        } catch (error) {
          console.error('Failed to upload media:', error);
          throw new Error('Не удалось загрузить медиа файлы');
        }
      }
      
      contentType = 'text_with_media';
    }

    // Проверяем, есть ли HTML теги форматирования
    const hasFormatting = /<\/?(?:b|i|s|u|code|pre|tg-spoiler)>/i.test(content.text);
    const hasSpoiler = /<\/?tg-spoiler>/i.test(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    const request: CreatePostRequest = {
      content_type: contentType,
      text_content: content.text || undefined,
      formatted_content: formattedContent,
      media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      media_blur: mediaUrls.length > 0 ? mediaBlurArray : undefined,
      channel_ids: settings.channelIds,
      pin_message: settings.pinPost,
      disable_notification: !settings.notifySubscribers,
      status: 'draft',
      inline_keyboard: inlineKeyboard,
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
