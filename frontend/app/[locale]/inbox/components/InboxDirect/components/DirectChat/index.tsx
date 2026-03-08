'use client';

import { useState, useRef, useEffect, useMemo, useCallback, FC } from 'react';
import styles from './styles.module.scss';
import MessageElement from './components/MessageElement';
import MessageField, { type MessageFieldRef } from './components/MessageField';
import { BlockedIcon, ChatChevronIcon, PinIcon } from '@/components/icons';
import classNames from 'classnames';
import Loader from '@/components/loader/loader';
import { useDateSeparator } from './useDateSeparator';
import { useDirectChat, useDirectMessages } from '@/app/[locale]/inbox/store/hooks/useDirectChat';
import type { BotMessageResponse } from '@/app/[locale]/inbox/store/thunks/directChat';
import { uploadMediaFile } from '@/app/[locale]/create-post/store/thunks/api';
import { API_BASE_URL } from '@/app/[locale]/create-post/store/thunks/api';

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function mapMessageType(msg: BotMessageResponse): 'incoming' | 'outgoing' | 'system' {
  return msg.is_incoming ? 'incoming' : 'outgoing';
}

function mapMediaItems(msg: BotMessageResponse) {
  if (!msg.media_url) return undefined;
  const typeMap: Record<string, 'image' | 'video' | 'file'> = {
    PHOTO: 'image',
    VIDEO: 'video',
    DOCUMENT: 'file',
    AUDIO: 'file',
    ANIMATION: 'video',
  };
  return [{
    type: typeMap[msg.message_type] || 'file',
    src: msg.media_url,
    id: String(msg.id),
  }];
}

interface DirectChatProps {
  onClose?: () => void;
}

const DirectChat: FC<DirectChatProps> = ({ onClose }) => {
  const {
    activeChat,
    activeChatId,
    sendMessage,
    pinChat,
    unpinChat,
    blockChat,
    unblockChat,
    editMessage,
    deleteMessage,
    fetchMessages,
    replyToMessageId,
    setReplyToMessageId,
  } = useDirectChat();

  const tgChatId = activeChat?.tg_chat_id ?? 0;
  const { messages, loading } = useDirectMessages(tgChatId);

  const [message, setMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<{ id: number; text: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: number; text: string } | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevMessagesRef = useRef<string>('');
  const messageFieldRef = useRef<MessageFieldRef>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const shouldScrollAfterSendRef = useRef(false);

  const isPinned = activeChat?.is_pinned ?? false;
  const isBlocked = activeChat?.is_blocked ?? false;

  const userName = activeChat
    ? [activeChat.tg_first_name, activeChat.tg_last_name].filter(Boolean).join(' ') || activeChat.tg_username || ''
    : '';

  useEffect(() => {
    if (activeChat) {
      fetchMessages({ botId: activeChat.bot_id, tgChatId: activeChat.tg_chat_id });
      prevMessagesRef.current = '';
    }
  }, [activeChat?.bot_id, activeChat?.tg_chat_id, fetchMessages]);

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;

    const sentinel = bottomRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isNearBottomRef.current = entry.isIntersecting;
      },
      { root: el, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const lastMessageId = messages[0]?.id;
  useEffect(() => {
    if (!loading && lastMessageId && (isNearBottomRef.current || shouldScrollAfterSendRef.current)) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      shouldScrollAfterSendRef.current = false;
    }
  }, [lastMessageId, loading]);

  useEffect(() => {
    if (replyToMessageId && messages.length > 0) {
      const msg = messages.find((m) => m.telegram_message_id === replyToMessageId);
      if (msg) {
        setReplyingTo({ id: msg.telegram_message_id, text: msg.text_content || '' });
      }
      setReplyToMessageId(null);
    }
  }, [replyToMessageId, messages, setReplyToMessageId]);

  const messagesWithDate = useMemo(
    () => {
      const reversedMessages = [...messages].reverse();
      return reversedMessages.map((msg) => ({
        ...msg,
        date: new Date(msg.created_at),
      }));
    },
    [messages]
  );

  const { visibleDate, showDateSeparator } = useDateSeparator({
    messages: messagesWithDate,
    messageListRef,
    messageRefs,
  });

  const handleSendMessage = async () => {
    if (!activeChat) return;
    
    const { mediaFiles } = messageFieldRef.current || { mediaFiles: [] };
    const hasText = message.trim().length > 0;
    const hasMedia = mediaFiles.length > 0;
    
    if (!hasText && !hasMedia) return;
    
    let mediaUrl: string | undefined;
    let mediaType: 'TEXT' | 'PHOTO' | 'VIDEO' | 'DOCUMENT' | undefined;
    
    if (hasMedia && mediaFiles[0].file && !mediaFiles[0].url) {
      try {
        const uploaded = await uploadMediaFile(mediaFiles[0].file);
        const baseUrl = API_BASE_URL.replace('/api', '');
        mediaUrl = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
        
        const fileType = mediaFiles[0].type;
        if (fileType === 'image') {
          mediaType = 'PHOTO';
        } else if (fileType === 'video') {
          mediaType = 'VIDEO';
        } else {
          mediaType = 'DOCUMENT';
        }
      } catch (error) {
        console.error('Failed to upload media:', error);
        return;
      }
    } else if (hasMedia && mediaFiles[0].url) {
      mediaUrl = mediaFiles[0].url;
      const fileType = mediaFiles[0].type;
      if (fileType === 'image') {
        mediaType = 'PHOTO';
      } else if (fileType === 'video') {
        mediaType = 'VIDEO';
      } else {
        mediaType = 'DOCUMENT';
      }
    }
    
    sendMessage({
      text_content: hasText ? message : undefined,
      media_url: mediaUrl,
      media_type: mediaType,
      reply_to_message_id: replyingTo?.id,
    });

    setMessage('');
    setReplyingTo(null);
    shouldScrollAfterSendRef.current = true;
  };

  const handlePinChat = async () => {
    if (!activeChatId) return;
    if (isPinned) {
      await unpinChat(activeChatId);
    } else {
      await pinChat(activeChatId);
    }
  };

  const handleBlockChat = async () => {
    if (!activeChatId) return;
    if (isBlocked) {
      await unblockChat(activeChatId);
    } else {
      await blockChat(activeChatId);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!activeChat) return;
    await deleteMessage({
      messageId,
      chatId: activeChat.tg_chat_id,
    });
  };

  const handleStartEdit = useCallback((msg: BotMessageResponse & { date: Date }) => {
    setEditingMessage({ id: msg.id, text: msg.text_content || '' });
    setReplyingTo(null);
    setMessage(msg.text_content || '');
    messageFieldRef.current?.handleClearMedia();
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessage('');
  }, []);

  const handleStartReply = useCallback((msg: BotMessageResponse & { date: Date }) => {
    setReplyingTo({ id: msg.telegram_message_id, text: msg.text_content || '' });
    setEditingMessage(null);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleSendOrEdit = async () => {
    if (editingMessage) {
      const trimmed = message.trim();
      if (!trimmed || trimmed === editingMessage.text) {
        handleCancelEdit();
        return;
      }
      await editMessage({ messageId: editingMessage.id, text_content: trimmed });
      setEditingMessage(null);
      setMessage('');
      return;
    }
    await handleSendMessage();
  };

  return (
    <div className={styles.directChat}>
      <div className={styles.header}>
        <button className={styles.backButton} type="button" onClick={onClose}>
          <ChatChevronIcon width={32} height={32} />
        </button>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{userName}</span>
        </div>
        <div className={styles.headerActionsWrapper}>
          <div className={styles.headerActions}>
            <button
              className={classNames(styles.iconButtonPin, { [styles.blue]: isPinned })}
              type="button"
              onClick={handlePinChat}
            >
              <PinIcon width={16} height={16} />
            </button>
            <button
              className={classNames(styles.iconButtonBlock, { [styles.destructive]: isBlocked })}
              type="button"
              onClick={handleBlockChat}
            >
              <BlockedIcon width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
      {showDateSeparator && visibleDate && (
        <div className={styles.dateSeparator}>
          <span>{visibleDate}</span>
        </div>
      )}
      <div className={styles.messageList} ref={messageListRef}>
        {loading && (
          <div className={styles.loadingMessages}>
            <Loader />
          </div>
        )}
        {!loading && messagesWithDate.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <h3 className={styles.emptyStateTitle}>Сообщений пока нет</h3>
              <p className={styles.emptyStateSubtitle}>
                Выберите один из чатов в списке
              </p>
            </div>
          </div>
        )}
        {messagesWithDate.map((msg, i) => (
          <div
            key={msg.id}
            ref={(el) => {
              messageRefs.current[i] = el;
            }}
          >
            <MessageElement
              type={mapMessageType(msg)}
              text={msg.text_content || undefined}
              mediaItems={mapMediaItems(msg)}
              time={formatMessageTime(msg.created_at)}
              onEdit={!msg.is_incoming ? () => handleStartEdit(msg) : undefined}
              onReply={msg.is_incoming ? () => handleStartReply(msg) : undefined}
              onDelete={() => handleDeleteMessage(msg.id)}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageField
        ref={messageFieldRef}
        value={message}
        onChange={setMessage}
        onSendMessage={handleSendOrEdit}
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
};

export default DirectChat;
