import type { EventType, InboxEventResponse } from '@/store/inbox';

export const SOURCE_LABELS: Record<string, string> = {
  bot: 'Бот',
  channel: 'Канал',
  system: 'Системные',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  bot_message: 'Сообщение',
  bot_command: 'Команда',
  bot_error: 'Ошибка',
  channel_comment: 'Комментарий',
  channel_join_request: 'Заявка',
  channel_link_join: 'Ссылка',
  channel_ban: 'Блокировка',
  channel_member_joined: 'Вступил',
  channel_member_left: 'Покинул',
  channel_title_changed: 'Название',
  channel_photo_changed: 'Аватар',
  channel_pinned_message: 'Закреп',
  system_notification: 'Уведомление',
  system_trigger: 'Триггер',
  system_autoreply: 'Автоответ',
  system_update: 'Обновление',
};

export function getSourceDisplayText(item: InboxEventResponse): string {
  const hasBotContext = item.entity_type === 'bot';
  const name = item.tg_bot_name?.trim();
  const username = item.tg_bot_username?.trim();
  if (hasBotContext && (name || username)) {
    if (name) return name;
    return username!.startsWith('@') ? username! : `@${username}`;
  }
  return SOURCE_LABELS[item.entity_type] || item.entity_type;
}

export function getBlockModalContext(item: InboxEventResponse): {
  reason?: string;
  reasonSource: string;
} {
  const reason =
    (typeof item.reason === 'string' && item.reason.trim() ? item.reason : null) ??
    (typeof item.payload?.reason === 'string' && (item.payload.reason as string).trim() ? (item.payload.reason as string) : null) ??
    undefined;
  const reasonSource =
    (typeof item.reason_source === 'string' && item.reason_source ? item.reason_source : null) ??
    (typeof item.payload?.reason_source === 'string' && item.payload.reason_source ? (item.payload.reason_source as string) : null) ??
    'spam';
  return {
    reason,
    reasonSource,
  };
}
