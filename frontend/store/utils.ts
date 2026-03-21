import type { ButtonRow, InlineKeyboard } from '@/types/post';

export function buildInlineKeyboard(rows: ButtonRow[]): InlineKeyboard | undefined {
  const buttons = rows
    .map(row => row.buttons.filter(btn => btn.text?.trim()).map(btn => ({
      text: btn.text, type: btn.type, url: btn.url,
      hidden_text_subscribed: btn.hidden_text_subscribed,
      hidden_text_unsubscribed: btn.hidden_text_unsubscribed,
      callback_action: btn.callback_action,
      callback_response: btn.callback_response,
    })))
    .filter(row => row.length > 0);
  return buttons.length > 0 ? { buttons } : undefined;
}
