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

interface RenderedMessageGroup {
  id: string;
  telegramMessageId: number;
  replyToMessageId: number | null;
  date: Date;
  time: string;
  type: 'incoming' | 'outgoing' | 'system';
  text?: string;
  mediaItems?: ReturnType<typeof mapMediaItems>;
  onEdit?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
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
  const { messages, loading, hasMore } = useDirectMessages(tgChatId);

  const [message, setMessage] = useState('');
  const [editingMessage, setEditingMessage] = useState<{ id: number; text: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: number; text: string } | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevMessagesRef = useRef<string>('');
  const messageFieldRef = useRef<MessageFieldRef>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const shouldScrollAfterSendRef = useRef(false);
  const loadingMoreRef = useRef(false);

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

  useEffect(() => {
    const el = messageListRef.current;
    const sentinel = topSentinelRef.current;
    if (!el || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading && activeChat && !loadingMoreRef.current) {
          loadingMoreRef.current = true;
          const prevScrollHeight = el.scrollHeight;
          fetchMessages({
            botId: activeChat.bot_id,
            tgChatId: activeChat.tg_chat_id,
            skip: messages.length,
            limit: 50,
          }).then(() => {
            requestAnimationFrame(() => {
              const newScrollHeight = el.scrollHeight;
              el.scrollTop = newScrollHeight - prevScrollHeight;
              loadingMoreRef.current = false;
            });
          });
        }
      },
      { root: el, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, activeChat, messages.length, fetchMessages]);

  const lastMessageId = messages[0]?.id;
  useEffect(() => {
    if (!loading && lastMessageId && (isNearBottomRef.current || shouldScrollAfterSendRef.current)) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      shouldScrollAfterSendRef.current = false;
    }
  }, [lastMessageId, loading]);

  useEffect(() => {
    if (replyToMessageId && messages.length > 0) {
      const msg = messages.find((m) => m.message_id === replyToMessageId);
      if (msg) {
        setReplyingTo({ id: msg.message_id, text: msg.text_content || '' });
      }
      setReplyToMessageId(null);
    }
  }, [replyToMessageId, messages, setReplyToMessageId]);

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
    let replyText = msg.text_content || '';
    if (!replyText && (msg.media_url || msg.media_file_id)) {
      const mediaTypeLabels: Record<string, string> = {
        PHOTO: 'Фото',
        VIDEO: 'Видео',
        DOCUMENT: 'Документ',
        AUDIO: 'Аудио',
        VOICE: 'Голосовое сообщение',
        STICKER: 'Стикер',
        ANIMATION: 'GIF',
      };
      replyText = mediaTypeLabels[msg.message_type] || 'Медиа';
    }
    setReplyingTo({ id: msg.telegram_message_id, text: replyText });
    setEditingMessage(null);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const renderedMessages = useMemo<RenderedMessageGroup[]>(() => {
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
        date: new Date(primaryMessage.created_at),
        time: formatMessageTime(latestMessage.created_at),
        type: mapMessageType(primaryMessage),
        text,
        mediaItems: mapMediaItems(groupedMessages),
        onEdit: !primaryMessage.is_incoming && groupedMessages.length === 1
          ? () => handleStartEdit({ ...primaryMessage, date: new Date(primaryMessage.created_at) })
          : undefined,
        onReply: primaryMessage.is_incoming
          ? () => handleStartReply({ ...primaryMessage, date: new Date(primaryMessage.created_at) })
          : undefined,
        onDelete: groupedMessages.length === 1
          ? () => handleDeleteMessage(primaryMessage.id)
          : undefined,
      };
    });
  }, [messages, handleStartEdit, handleStartReply]);

  const replyLookup = useMemo(() => {
    const map = new Map<number, { text: string; index: number }>();
    renderedMessages.forEach((msg, index) => {
      map.set(msg.telegramMessageId, {
        text: msg.text || (msg.mediaItems ? 'Медиа' : ''),
        index,
      });
    });
    return map;
  }, [renderedMessages]);

  const scrollToMessage = useCallback((telegramMessageId: number) => {
    const info = replyLookup.get(telegramMessageId);
    if (info == null) return;
    const el = messageRefs.current[info.index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background 0.3s';
      el.style.background = 'rgba(59, 130, 246, 0.12)';
      el.style.borderRadius = '12px';
      setTimeout(() => {
        el.style.background = '';
        el.style.borderRadius = '';
      }, 1500);
    }
  }, [replyLookup]);

  const { visibleDate, showDateSeparator } = useDateSeparator({
    messages: renderedMessages,
    messageListRef,
    messageRefs,
  });

  const handleSendMessage = async () => {
    if (!activeChat) return;
    
    const { mediaFiles } = messageFieldRef.current || { mediaFiles: [] };
    const hasText = message.trim().length > 0;
    const hasMedia = mediaFiles.length > 0;
    
    if (!hasText && !hasMedia) return;

    const replyToMessageId = replyingTo?.id;

    try {
      if (hasMedia) {
        const mediaUrls: string[] = [];

        for (const mediaFile of mediaFiles) {
          let mediaUrl = mediaFile.url;

          if (mediaFile.file && !mediaUrl) {
            const uploaded = await uploadMediaFile(mediaFile.file);
            const baseUrl = API_BASE_URL.replace('/api', '');
            mediaUrl = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
          }

          if (mediaUrl) {
            mediaUrls.push(mediaUrl);
          }
        }

        await sendMessage({
          text_content: hasText ? message : undefined,
          media_urls: mediaUrls,
          reply_to_message_id: replyToMessageId,
        });
      } else {
        await sendMessage({
          text_content: message,
          reply_to_message_id: replyToMessageId,
        });
      }
    } catch (error) {
      console.error('Failed to send direct message:', error);
      return;
    }
    
    setMessage('');
    messageFieldRef.current?.handleClearMedia();
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
        {loading && messages.length === 0 && (
          <div className={styles.loadingMessages}>
            <Loader />
          </div>
        )}
        {hasMore && <div ref={topSentinelRef} style={{ height: 1, flexShrink: 0 }} />}
        {loading && messages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', flexShrink: 0 }}>
            <Loader size={20} />
          </div>
        )}
        {!loading && renderedMessages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <h3 className={styles.emptyStateTitle}>Сообщений пока нет</h3>
              <p className={styles.emptyStateSubtitle}>
                Выберите один из чатов в списке
              </p>
            </div>
          </div>
        )}
        {renderedMessages.map((msg, i) => (
          <div
            key={msg.id}
            ref={(el) => {
              messageRefs.current[i] = el;
            }}
          >
            <MessageElement
              type={msg.type}
              text={msg.text}
              mediaItems={msg.mediaItems}
              time={msg.time}
              replyTo={msg.replyToMessageId && replyLookup.has(msg.replyToMessageId) ? {
                text: replyLookup.get(msg.replyToMessageId)!.text,
                onClick: () => scrollToMessage(msg.replyToMessageId!),
              } : undefined}
              onEdit={msg.onEdit}
              onReply={msg.onReply}
              onDelete={msg.onDelete}
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
