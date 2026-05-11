import type { Draft, MediaFile } from '@/types/post';

function getMediaType(url: string): 'image' | 'video' | 'document' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'document';
}

export function draftToMediaFiles(draft: Draft): MediaFile[] {
  if (!draft.media_urls?.length) return [];
  return draft.media_urls.map((url, index) => ({
    id: `draft-media-${draft.id}-${index}`,
    url,
    type: getMediaType(url),
    blur: draft.media_blur?.[index] ?? false,
    thumbnail_url: draft.media_thumbnail_urls?.[index] ?? null,
    telegram_file_id: draft.media_file_ids?.[index] ?? null,
  }));
}

export function buildDraftPreviewPayload(draft: Draft) {
  const channel = draft.channels?.[0];
  const extraCount = draft.channels && draft.channels.length > 1
    ? `+${draft.channels.length - 1}`
    : undefined;
  return {
    channelTitle: channel?.title,
    channelPhotoUrl: channel?.photo_url,
    channelMembersCount: channel?.members_count,
    channelExtraCount: extraCount,
    html: draft.formatted_content?.text || draft.text_content || '',
    mediaFiles: draftToMediaFiles(draft),
    inlineKeyboard: draft.inline_keyboard?.buttons?.length
      ? { buttons: draft.inline_keyboard.buttons }
      : undefined,
    quizData: draft.poll_data?.question ? {
      mode: (draft.poll_data.is_quiz ? 'quiz' : 'poll') as 'quiz' | 'poll',
      question: draft.poll_data.question,
      options: draft.poll_data.options,
      isAnonymous: draft.poll_data.is_anonymous ?? true,
      allowsMultipleAnswers: draft.poll_data.allows_multiple_answers ?? false,
      correctAnswerIndex: draft.poll_data.correct_option_id ?? undefined,
    } : undefined,
  };
}
