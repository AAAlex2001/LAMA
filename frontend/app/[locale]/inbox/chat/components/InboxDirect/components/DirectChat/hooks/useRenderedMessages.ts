import type { BotMessageResponse } from '@/[locale]/inbox/store/thunks/directChat';

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function mapMessageType(msg: BotMessageResponse): 'incoming' | 'outgoing' | 'system' {
  if (msg.is_system) {
    return 'system';
  }
  return msg.is_incoming ? 'incoming' : 'outgoing';
}

const MEDIA_TYPE_LABELS: Record<string, string> = {
  PHOTO: 'Фото',
  VIDEO: 'Видео',
  DOCUMENT: 'Документ',
  AUDIO: 'Аудио',
  VOICE: 'Голосовое сообщение',
  STICKER: 'Стикер',
  ANIMATION: 'GIF',
};

export function getReplyText(msg: BotMessageResponse): string {
  let replyText = msg.text_content || '';
  if (!replyText && (msg.media_url || msg.media_file_id)) {
    replyText = MEDIA_TYPE_LABELS[msg.message_type] || 'Медиа';
  }
  return replyText;
}

function mapMediaItems(messages: BotMessageResponse[]) {
  const typeMap: Record<string, 'image' | 'video' | 'file'> = {
    PHOTO: 'image',
    VIDEO: 'video',
    DOCUMENT: 'file',
    AUDIO: 'file',
    ANIMATION: 'video',
  };

  const items = messages
    .filter((msg) => Boolean(msg.media_url) || msg.message_type === 'DOCUMENT' || msg.message_type === 'AUDIO')
    .map((msg) => ({
      type: typeMap[msg.message_type] || 'file',
      src: msg.media_url || undefined,
      id: String(msg.id),
      name: msg.media_name || undefined,
      size: msg.media_size || undefined,
    }));

  return items.length > 0 ? items : undefined;
}

export interface RenderedMessageGroup {
  id: string;
  telegramMessageId: number;
  replyToMessageId: number | null;
  replyMessageText: string | null;
  replyMediaUrl: string | null;
  replyMessageType: string | null;
  replyIsPost: boolean;
  date: Date;
  time: string;
  type: 'incoming' | 'outgoing' | 'system';
  text?: string;
  mediaItems?: ReturnType<typeof mapMediaItems>;
  onEdit?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
}

function groupAndMapMessages(
  messages: BotMessageResponse[],
  onEdit: (msg: BotMessageResponse & { date: Date }) => void,
  onReply: (msg: BotMessageResponse & { date: Date }) => void,
  onDelete: (id: number) => void,
): RenderedMessageGroup[] {
  const reversedMessages = [...messages].reverse();
  const groups: Array<{ messages: BotMessageResponse[] }> = [];

  for (const msg of reversedMessages) {
    const lastGroup = groups[groups.length - 1];
    const canAppendToGroup = Boolean(
      msg.media_group_id &&
      lastGroup &&
      lastGroup.messages[0]?.media_group_id === msg.media_group_id &&
      lastGroup.messages[0]?.is_incoming === msg.is_incoming
    );

    if (canAppendToGroup && lastGroup) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ messages: [msg] });
    }
  }

  return groups.map(({ messages: groupedMessages }) => {
    const primaryMessage = groupedMessages.find((msg) => msg.text_content)?.media_group_id
      ? groupedMessages.find((msg) => msg.text_content) || groupedMessages[0]
      : groupedMessages[0];
    const latestMessage = groupedMessages[groupedMessages.length - 1];
    const text = groupedMessages.find((msg) => msg.text_content)?.text_content || undefined;

    return {
      id: primaryMessage.media_group_id || String(primaryMessage.id),
      telegramMessageId: primaryMessage.telegram_message_id,
      replyToMessageId: primaryMessage.reply_to_message_id,
      replyMessageText: primaryMessage.reply_message_text,
      replyMediaUrl: primaryMessage.reply_media_url ?? null,
      replyMessageType: primaryMessage.reply_message_type ?? null,
      replyIsPost: primaryMessage.reply_is_post ?? false,
      date: new Date(primaryMessage.created_at),
      time: formatMessageTime(latestMessage.created_at),
      type: mapMessageType(primaryMessage),
      text,
      mediaItems: mapMediaItems(groupedMessages),
      onEdit: !primaryMessage.is_incoming && groupedMessages.length === 1
        ? () => onEdit({ ...primaryMessage, date: new Date(primaryMessage.created_at) })
        : undefined,
      onReply: !primaryMessage.is_system
        ? () => onReply({ ...primaryMessage, date: new Date(primaryMessage.created_at) })
        : undefined,
      onDelete: groupedMessages.length === 1
        ? () => onDelete(primaryMessage.id)
        : undefined,
    };
  });
}

export function useRenderedMessages(
  messages: BotMessageResponse[],
  onEdit: (msg: BotMessageResponse & { date: Date }) => void,
  onReply: (msg: BotMessageResponse & { date: Date }) => void,
  onDelete: (id: number) => void,
): RenderedMessageGroup[] {
  return groupAndMapMessages(messages, onEdit, onReply, onDelete);
}
