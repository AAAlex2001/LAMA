import type { CreatePostRequest, InlineKeyboard, PollData, ContentType } from './types';
import type { MediaFile } from '@/components/media-preview';
import { createAndPublishPost, createSeries, saveDraft, createAndSchedulePost } from './api';
import type { ButtonRow } from '@/components/inline-buttons';
import type { QuizFormState } from '@/components/quiz-form/store/types';
import { selectPollData as selectQuizPollData } from '@/components/quiz-form/store/selectors';
import { extractPlainTextFromHtml, hasSupportedFormatting } from './text';
import { prepareMediaPayload } from './mediaPayload';
import { buildBaseCreatePostRequest } from './createPostRequest';
import type { PostSettingsFromUI } from './uiTypes';
import type { AutoDeleteOption } from '@/components/post-settings/store/types';

export interface SeriesPostInput {
  text: string;
  mediaFiles?: MediaFile[];
  buttonRows?: ButtonRow[];
  showInlineButtons?: boolean;
  showQuizForm?: boolean;
  quizForm?: QuizFormState;
  showLinkPreview?: boolean;
}

// Конвертация AutoDeleteOption в секунды
function convertAutoDeleteToSeconds(
  interval: AutoDeleteOption, 
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
  showLinkPreview?: boolean,
  series?: { seriesId: number; seriesOrder: number },
  replyToPostId?: number
) {
  try {
    const plainText = extractPlainTextFromHtml(content.text);

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
    let mediaBlurArray = mediaFiles.map(f => f.blur || false);
    
    if (hasMedia) {
      const prepared = await prepareMediaPayload(mediaFiles);

      mediaUrls = prepared.mediaUrls;
      mediaFileIds = prepared.mediaFileIds;
      mediaThumbnailUrls = prepared.mediaThumbnailUrls;
      mediaBlurArray = prepared.mediaBlurArray;
      contentType = 'text_with_media';
    }

    // Если контента кроме опроса нет — публикуем как poll/quiz
    if (!hasText && !hasMedia && hasPoll) {
      contentType = pollData?.is_quiz ? 'quiz' : 'poll';
    }

    const hasFormatting = hasText && hasSupportedFormatting(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    const request: CreatePostRequest = {
      ...buildBaseCreatePostRequest({
        contentType,
        text: content.text,
        hasText,
        formattedContent,
        mediaUrls,
        mediaThumbnailUrls,
        mediaFileIds,
        mediaBlurArray,
        inlineKeyboard,
        pollData: hasPoll ? pollData : undefined,
        showLinkPreview,
        status: 'draft',
        settings,
      }),
      series_id: series?.seriesId,
      series_order: series?.seriesOrder,
      auto_delete_delay_seconds: autoDeleteSeconds,
      reply_to_post_id: replyToPostId,
    };

    console.log('📤 Отправка запроса на публикацию:', {
      tag_names: request.tag_names,
      tag_color: request.tag_color,
      settings: settings,
    });

    const response = await createAndPublishPost(request);

    if (response.id) {
      return {
        success: true,
        message: response.message || 'OK — публикация поставлена в очередь',
        postId: response.id,
      };
    } else {
      return {
        success: false,
        message: response.message || 'Не удалось опубликовать пост',
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

function toInlineKeyboard(buttonRows?: ButtonRow[], showInlineButtons?: boolean): InlineKeyboard | undefined {
  if (!showInlineButtons) return undefined;
  if (!buttonRows || buttonRows.length === 0) return undefined;

  const buttons = buttonRows
    .map(row =>
      row.buttons
        .filter(btn => btn.text && btn.text.trim().length > 0)
        .map(btn => {
          const button: any = { text: btn.text };
          if (btn.type === 'url' && btn.url) button.url = btn.url;
          if (btn.type === 'callback' && btn.callback_data) button.callback_data = btn.callback_data;
          return button;
        })
    )
    .filter(row => row.length > 0);

  return buttons.length > 0 ? { buttons } : undefined;
}

export async function handlePublishSeriesNow(
  posts: SeriesPostInput[],
  settings: PostSettingsFromUI,
  options?: { name?: string; description?: string | null; replyToPrevious?: boolean }
) {
  const name = options?.name || `Серия ${new Date().toLocaleString()}`;
  const description = options?.description ?? null;
  const replyToPrevious = options?.replyToPrevious ?? true;

  const series = await createSeries({ name, description, reply_to_previous: replyToPrevious });

  const results: Array<{ index: number; ok: boolean; message?: string; postId?: number }> = [];

  for (let i = 0; i < posts.length; i += 1) {
    const p = posts[i];
    const media = p.mediaFiles || [];
    const inlineKeyboard = toInlineKeyboard(p.buttonRows, p.showInlineButtons);
    const pollData = p.showQuizForm && p.quizForm ? selectQuizPollData(p.quizForm) : null;

    // Более понятная ошибка для серии: показываем номер поста, который считается пустым.
    const plainText = extractPlainTextFromHtml(p.text || '');
    const hasText = plainText.length > 0;
    const hasMedia = media.length > 0;
    const hasPoll = !!pollData;

    if (!hasText && !hasMedia && !hasPoll) {
      results.push({
        index: i,
        ok: false,
        message: `Пост ${i + 1}: текст или медиа не могут быть пустыми`,
      });
      break;
    }

    const res = await handlePublishNow(
      { text: p.text },
      settings,
      media,
      inlineKeyboard,
      pollData,
      p.showQuizForm,
      p.showLinkPreview,
      { seriesId: series.id, seriesOrder: i + 1 }
    );

    results.push({
      index: i,
      ok: !!res.success,
      message: res.success ? res.message : `Пост ${i + 1}: ${res.message}`,
      postId: (res as any).postId || (res as any).id,
    });

    if (!res.success) break;
  }

  const ok = results.length === posts.length && results.every(r => r.ok);

  return {
    success: ok,
    seriesId: series.id,
    results,
    message: ok ? 'OK — серия поставлена в очередь' : (results.find(r => !r.ok)?.message || 'Не удалось опубликовать серию'),
  };
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
    const plainText = extractPlainTextFromHtml(content.text);

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
    let mediaBlurArray = mediaFiles.map(f => f.blur || false);
    
    if (mediaFiles.length > 0) {
      const prepared = await prepareMediaPayload(mediaFiles);

      mediaUrls = prepared.mediaUrls;
      mediaFileIds = prepared.mediaFileIds;
      mediaThumbnailUrls = prepared.mediaThumbnailUrls;
      mediaBlurArray = prepared.mediaBlurArray;
      contentType = 'text_with_media';
    }

    // Если контента кроме опроса нет — сохраняем как poll/quiz
    if (!hasText && !hasMedia && hasPoll) {
      contentType = pollData?.is_quiz ? 'quiz' : 'poll';
    }

    const hasFormatting = hasText && hasSupportedFormatting(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    // Конвертируем auto_delete настройки в секунды
    const autoDeleteSeconds = convertAutoDeleteToSeconds(
      settings.autoDeleteInterval,
      settings.autoDeleteCustomDays,
      settings.autoDeleteCustomHours
    );

    const request: CreatePostRequest = {
      ...buildBaseCreatePostRequest({
        contentType,
        text: content.text,
        hasText,
        formattedContent,
        mediaUrls,
        mediaThumbnailUrls,
        mediaFileIds,
        mediaBlurArray,
        inlineKeyboard,
        pollData: hasPoll ? pollData : undefined,
        showLinkPreview,
        status: 'draft',
        settings,
      }),
      auto_delete_delay_seconds: autoDeleteSeconds,
    };

    const response = await saveDraft(request);

    if (response.id) {
      return {
        success: true,
        message: response.message || 'Черновик сохранён!',
        postId: response.id,
      };
    } else {
      return {
        success: false,
        message: response.message || 'Не удалось сохранить черновик',
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

export async function handleSchedulePost(
  content: { text: string },
  settings: PostSettingsFromUI,
  scheduledDate: Date,
  mediaFiles: MediaFile[] = [],
  inlineKeyboard?: InlineKeyboard,
  pollData?: PollData | null,
  pollFormOpen?: boolean,
  showLinkPreview?: boolean,
  replyToPostId?: number
) {
  try {
    const plainText = extractPlainTextFromHtml(content.text);

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
    let mediaBlurArray = mediaFiles.map(f => f.blur || false);
    
    if (hasMedia) {
      const prepared = await prepareMediaPayload(mediaFiles);

      mediaUrls = prepared.mediaUrls;
      mediaFileIds = prepared.mediaFileIds;
      mediaThumbnailUrls = prepared.mediaThumbnailUrls;
      mediaBlurArray = prepared.mediaBlurArray;
      contentType = 'text_with_media';
    }

    // Если контента кроме опроса нет — публикуем как poll/quiz
    if (!hasText && !hasMedia && hasPoll) {
      contentType = pollData?.is_quiz ? 'quiz' : 'poll';
    }

    const hasFormatting = hasText && hasSupportedFormatting(content.text);
    const formattedContent = hasFormatting ? {
      text: content.text,
      parse_mode: 'HTML'
    } : undefined;

    const request: CreatePostRequest = {
      ...buildBaseCreatePostRequest({
        contentType,
        text: content.text,
        hasText,
        formattedContent,
        mediaUrls,
        mediaThumbnailUrls,
        mediaFileIds,
        mediaBlurArray,
        inlineKeyboard,
        pollData: hasPoll ? pollData : undefined,
        showLinkPreview,
        status: 'scheduled',
        settings,
      }),
      scheduled_time: scheduledDate.toISOString(),
      auto_delete_delay_seconds: autoDeleteSeconds,
      reply_to_post_id: replyToPostId,
    };

    console.log('📅 Отправка запроса на планирование:', {
      scheduled_time: request.scheduled_time,
      tag_names: request.tag_names,
      settings: settings,
    });

    const response = await createAndSchedulePost(request);

    if (response.id) {
      return {
        success: true,
        message: response.message || 'Пост успешно запланирован',
        postId: response.id,
      };
    } else {
      return {
        success: false,
        message: response.message || 'Не удалось запланировать пост',
      };
    }
  } catch (error) {
    console.error('Ошибка при планировании поста:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
}
