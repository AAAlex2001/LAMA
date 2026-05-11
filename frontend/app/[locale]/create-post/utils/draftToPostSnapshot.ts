import type { Draft, InlineButton } from '@/types/post';
import type { ButtonRow, MediaFile, PostSnapshot, QuizAnswer } from '../store/types';
import { API_BASE_URL } from '@/store/api';
import { TAG_COLORS } from '@/types';
import type { TagColor } from '@/types';

function validTagColor(color: string | undefined): string {
  if (color && TAG_COLORS.includes(color as TagColor)) return color as string;
  return '#FAC7C7';
}

export function draftToPostSnapshot(draft: Draft): PostSnapshot {
  const baseUrl = API_BASE_URL.replace('/api', '');

  const textContent =
    draft.formatted_content?.html
    || draft.formatted_content?.text
    || draft.text_content
    || '';

  let mediaFiles: MediaFile[] = [];
  if (draft.media_urls && draft.media_urls.length > 0) {
    mediaFiles = draft.media_urls.map((url: string, index: number) => {
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      const thumbUrl = draft.media_thumbnail_urls?.[index];
      const fullThumb = thumbUrl ? (thumbUrl.startsWith('http') ? thumbUrl : `${baseUrl}${thumbUrl}`) : null;
      const lowerUrl = url.toLowerCase();
      const isVideo =
        lowerUrl.includes('/videos/')
        || lowerUrl.endsWith('.mp4')
        || lowerUrl.endsWith('.mov')
        || lowerUrl.endsWith('.mkv');
      const isDocument =
        lowerUrl.endsWith('.pdf')
        || lowerUrl.endsWith('.doc')
        || lowerUrl.endsWith('.docx')
        || lowerUrl.endsWith('.txt')
        || lowerUrl.endsWith('.xls')
        || lowerUrl.endsWith('.xlsx')
        || lowerUrl.endsWith('.ppt')
        || lowerUrl.endsWith('.pptx')
        || lowerUrl.endsWith('.rtf')
        || lowerUrl.endsWith('.csv');

      return {
        id: `media-${draft.id}-${index}`,
        url: fullUrl,
        preview_url: isVideo ? fullThumb || '' : isDocument ? undefined : fullUrl,
        thumbnail_url: fullThumb,
        type: isDocument ? 'document' : isVideo ? 'video' : 'image',
        blur: draft.media_blur?.[index] || false,
        telegram_file_id: draft.media_file_ids?.[index] || null,
      } as MediaFile;
    });
  }

  let buttonRows: ButtonRow[] = [];
  let inlineButtonsOpen = false;
  if (draft.inline_keyboard?.buttons && draft.inline_keyboard.buttons.length > 0) {
    inlineButtonsOpen = true;
    buttonRows = draft.inline_keyboard.buttons.map((row: InlineButton[], ri: number) => ({
      id: `row-${draft.id}-${ri}`,
      buttons: row.map((btn: InlineButton, bi: number) => ({
        id: `btn-${draft.id}-${ri}-${bi}`,
        text: btn.text || '',
        type: btn.type || 'url',
        url: btn.url || '',
        callback_action: btn.callback_action || undefined,
        callback_response: btn.callback_response || '',
        hidden_text_subscribed: btn.hidden_text_subscribed || '',
        hidden_text_unsubscribed: btn.hidden_text_unsubscribed || '',
      })),
    }));
  }

  let quizOpen = false;
  let quizMode: PostSnapshot['quizMode'] = 'poll_single';
  let quizQuestion = '';
  let quizAnswers: QuizAnswer[] = [
    { id: `ans-${draft.id}-1`, text: '' },
    { id: `ans-${draft.id}-2`, text: '' },
  ];
  let quizCorrectAnswerId: string | null = null;

  if (draft.poll_data) {
    const pd = draft.poll_data;
    quizOpen = true;
    quizQuestion = pd.question || '';
    quizAnswers = (pd.options || []).map((opt: string, i: number) => ({
      id: `ans-${draft.id}-${i}`,
      text: opt,
    }));
    quizMode = pd.is_quiz ? 'quiz' : pd.allows_multiple_answers ? 'poll_multi' : 'poll_single';
    if (pd.is_quiz && pd.correct_option_id != null && quizAnswers[pd.correct_option_id]) {
      quizCorrectAnswerId = quizAnswers[pd.correct_option_id].id;
    }
  }

  const selectedTags =
    draft.tags?.map((tag) => ({
      name: tag.name,
      color: validTagColor(tag.color),
    })) ?? [];

  const snapshot: PostSnapshot = {
    text: textContent,
    mediaFiles,
    inlineButtonsOpen,
    buttonRows,
    quizOpen,
    quizMode,
    quizQuestion,
    quizAnswers,
    quizCorrectAnswerId,
    showLinkPreview: false,
    selectedTags,
    sourcePublicationId: draft.id,
    seriesId: draft.series_id ?? undefined,
    seriesOrder: draft.series_order ?? undefined,
  };

  return snapshot;
}
