import type { Draft } from '@/app/[locale]/create-post/store/types';
import { draftToMediaFiles } from './media-helpers';

/** Подготовка данных для превью поста (чистая функция, не хук) */
export function getPreviewData(post: Draft) {
  const channel = post.channels?.[0];
  const extraCount =
    post.channels?.length > 1 ? `+${post.channels.length - 1}` : undefined;

  return {
    channelTitle: channel?.title,
    channelPhotoUrl: channel?.photo_url,
    channelMembersCount: channel?.members_count,
    channelExtraCount: extraCount,
    html: post.formatted_content?.text || post.text_content || '',
    mediaFiles: draftToMediaFiles(post),
    inlineKeyboard: post.inline_keyboard?.buttons?.length
      ? { buttons: post.inline_keyboard.buttons }
      : undefined,
    quizData: post.poll_data?.question
      ? {
          mode: (post.poll_data.is_quiz ? 'quiz' : 'poll') as 'quiz' | 'poll',
          question: post.poll_data.question,
          options: post.poll_data.options,
          isAnonymous: post.poll_data.is_anonymous ?? true,
          allowsMultipleAnswers: post.poll_data.allows_multiple_answers ?? false,
          correctAnswerIndex: post.poll_data.correct_option_id ?? undefined,
        }
      : undefined,
  };
}
