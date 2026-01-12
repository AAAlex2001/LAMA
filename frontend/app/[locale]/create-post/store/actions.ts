import type { CreatePostRequest, RepeatInterval } from './types';
import { createAndPublishPost, saveDraft } from './api';

interface PostSettingsFromUI {
  channelIds: number[];
  notifySubscribers: boolean;
  pinPost: boolean;
  tagName: string | null;
  repeatInterval: RepeatInterval;
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

    const request: CreatePostRequest = {
      content_type: 'text',
      text_content: content.text,
      channel_ids: settings.channelIds,
      pin_message: settings.pinPost,
      status: 'draft',
      tag_names: settings.tagName ? [settings.tagName] : undefined,
      repeat_interval: settings.repeatInterval,
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

    const request: CreatePostRequest = {
      content_type: 'text',
      text_content: content.text,
      channel_ids: settings.channelIds,
      pin_message: settings.pinPost,
      status: 'draft',
      tag_names: settings.tagName ? [settings.tagName] : undefined,
      repeat_interval: settings.repeatInterval,
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
