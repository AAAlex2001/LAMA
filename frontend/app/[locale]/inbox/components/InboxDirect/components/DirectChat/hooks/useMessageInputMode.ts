import { useState, useCallback } from 'react';
import type { BotMessageResponse } from '@/app/[locale]/inbox/store/thunks/directChat';
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

export function useMessageInputMode(): MessageInputModeReturn {
  const [message, setMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<{ id: number; text: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: number; text: string } | null>(null);

  const startEdit = useCallback((msg: BotMessageResponse & { date: Date }) => {
    setReplyingTo(null);
    setEditingMessage({ id: msg.id, text: msg.text_content || '' });
    setMessage(msg.text_content || '');
  }, []);

  const startReply = useCallback((msg: BotMessageResponse & { date: Date }) => {
    setEditingMessage(null);
    setReplyingTo({ id: msg.telegram_message_id, text: getReplyText(msg) });
  }, []);

  const startReplyById = useCallback((telegramMessageId: number, messages: BotMessageResponse[]) => {
    const msg = messages.find((m) => m.telegram_message_id === telegramMessageId);
    if (msg) {
      setEditingMessage(null);
      setReplyingTo({ id: msg.telegram_message_id, text: getReplyText(msg) });
    }
  }, []);

  const reset = useCallback(() => {
    setMessage('');
    setEditingMessage(null);
    setReplyingTo(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessage('');
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

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
