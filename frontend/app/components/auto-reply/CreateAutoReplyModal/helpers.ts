import type { MediaFile } from '@/components/media-preview';
import type { InlineKeyboard, ButtonRow } from '@/types/post';
import { PREVIEW_REPLACEMENTS } from './constants';

export function renderPreview(text: string): string {
  return Object.entries(PREVIEW_REPLACEMENTS).reduce(
    (t, [key, val]) => t.replaceAll(key, val),
    text,
  );
}

export function mediaFilesFromUrls(urls: string[]): MediaFile[] {
  return urls.map((url, i) => {
    const isVideo = /\.(mp4|mov|avi|webm)/i.test(url);
    return {
      id: `edit-${i}-${Date.now()}`,
      type: isVideo ? 'video' : 'image',
      url,
      preview_url: url,
    } as MediaFile;
  });
}

export function buttonRowsFromKeyboard(kb: InlineKeyboard): ButtonRow[] {
  return kb.buttons.map((row) => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    buttons: row.map((btn) => ({
      id: `btn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: btn.text,
      type: btn.type ?? 'url',
      url: btn.url,
      callback_action: btn.callback_action,
      callback_response: btn.callback_response,
      hidden_text_subscribed: btn.hidden_text_subscribed,
      hidden_text_unsubscribed: btn.hidden_text_unsubscribed,
    })),
  }));
}
