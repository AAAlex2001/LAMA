import { useState, useRef, useEffect } from 'react';
import type { BotMessageResponse } from '@/[locale]/inbox/store/thunks/directChat';
import { getReplyText } from './useRenderedMessages';

export interface MessageInputModeReturn {
  message: string;
  setMessage: (message: string) => void;
  editingMessage: { id: number; text: string } | null;
  replyingTo: { id: number; text: string } | null;
  startEdit: (msg: BotMessageResponse & { date: Date }) => void;
  startReply: (msg: BotMessageResponse & { date: Date }) => void;
  startReplyById: (telegramMessageId: number, messages: BotMessageResponse[]) => void;
  reset: () => void;
  cancelEdit: () => void;
  cancelReply: () => void;
}

export function useMessageInputMode(activeChatId: string | null): MessageInputModeReturn {
  const draftsRef = useRef<Record<string, string>>({});
  const prevChatIdRef = useRef<string | null>(null);

  const [message, setMessageRaw] = useState('');
  const [editingMessage, setEditingMessage] = useState<{ id: number; text: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    const prevId = prevChatIdRef.current;

    if (prevId !== null && prevId !== activeChatId) {
      draftsRef.current[prevId] = message;
    }

    if (activeChatId !== null && activeChatId !== prevId) {
      setMessageRaw(draftsRef.current[activeChatId] ?? '');
      setEditingMessage(null);
      setReplyingTo(null);
    }

    prevChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const setMessage = (msg: string) => {
    setMessageRaw(msg);
    if (activeChatId !== null) {
      draftsRef.current[activeChatId] = msg;
    }
  };

  const startEdit = (msg: BotMessageResponse & { date: Date }) => {
    setReplyingTo(null);
    setEditingMessage({ id: msg.id, text: msg.text_content || '' });
    setMessageRaw(msg.text_content || '');
  };

  const startReply = (msg: BotMessageResponse & { date: Date }) => {
    setEditingMessage(null);
    setReplyingTo({ id: msg.telegram_message_id, text: getReplyText(msg) });
  };

  const startReplyById = (telegramMessageId: number, messages: BotMessageResponse[]) => {
    const msg = messages.find((m) => m.telegram_message_id === telegramMessageId);
    if (msg) {
      setEditingMessage(null);
      setReplyingTo({ id: msg.telegram_message_id, text: getReplyText(msg) });
    }
  };

  const reset = () => {
    setMessageRaw('');
    setEditingMessage(null);
    setReplyingTo(null);
    if (activeChatId !== null) {
      delete draftsRef.current[activeChatId];
    }
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    const restored = activeChatId !== null ? (draftsRef.current[activeChatId] ?? '') : '';
    setMessageRaw(restored);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  return {
    message,
    setMessage,
    editingMessage,
    replyingTo,
    startEdit,
    startReply,
    startReplyById,
    reset,
    cancelEdit,
    cancelReply,
  };
}
