import type { CreatePostRequest } from './types';
import { createAndPublishPost, saveDraft } from './api';

interface PostSettingsFromUI {
  channels: { id: string; name: string; selected: boolean }[];
  notifySubscribers: boolean;
  pinPost: boolean;
}

export async function handlePublishNow(
  content: { text: string },
  settings: PostSettingsFromUI
) {
  try {
    if (!content.text.trim()) {
      throw new Error('Текст поста не может быть пустым');
    }

    const selectedChannels = settings.channels.filter((ch) => ch.selected);
    if (selectedChannels.length === 0) {
      throw new Error('Выберите хотя бы один канал для публикации');
    }

    const request: CreatePostRequest = {
      content_type: 'text',
      text_content: content.text,
      channel_ids: selectedChannels.map((ch) => parseInt(ch.id)),
      pin_message: settings.pinPost,
      status: 'draft',
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

    const selectedChannels = settings.channels.filter((ch) => ch.selected);

    const request: CreatePostRequest = {
      content_type: 'text',
      text_content: content.text,
      channel_ids: selectedChannels.map((ch) => parseInt(ch.id)),
      pin_message: settings.pinPost,
      status: 'draft',
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
