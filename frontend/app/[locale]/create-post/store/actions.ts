import type { CreatePostRequest, RepeatInterval, AutoDeleteInterval } from './types';
import { createAndPublishPost, saveDraft } from './api';

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
  settings: PostSettingsFromUI
) {
  try {
    if (!content.text.trim()) {
      throw new Error('Текст поста не может быть пустым');
    }

    if (settings.channelIds.length === 0) {
      throw new Error('Выберите хотя бы один канал для публикации');
    }

    const autoDeleteSeconds = convertAutoDeleteToSeconds(
      settings.autoDeleteInterval,
      settings.autoDeleteCustomDays,
      settings.autoDeleteCustomHours
    );

    // Проверяем, есть ли HTML теги форматирования
    const hasFormatting = /<\/?(?:b|i|s|u|code|pre)>/i.test(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    const request: CreatePostRequest = {
      content_type: 'text',
      text_content: content.text,
      formatted_content: formattedContent,
      channel_ids: settings.channelIds,
      pin_message: settings.pinPost,
      status: 'draft',
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
  settings: PostSettingsFromUI
) {
  try {
    if (!content.text.trim()) {
      throw new Error('Текст поста не может быть пустым');
    }

    // Проверяем, есть ли HTML теги форматирования
    const hasFormatting = /<\/?(?:b|i|s|u|code|pre)>/i.test(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    const request: CreatePostRequest = {
      content_type: 'text',
      text_content: content.text,
      formatted_content: formattedContent,
      channel_ids: settings.channelIds,
      pin_message: settings.pinPost,
      status: 'draft',
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
