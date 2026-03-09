'use client';

import { useRef, useEffect, useMemo, useCallback, FC } from 'react';
import styles from './styles.module.scss';
import MessageElement from './components/MessageElement';
import MessageField, { type MessageFieldRef } from './components/MessageField';
import { BlockedIcon, ChatChevronIcon, PinIcon } from '@/components/icons';
import classNames from 'classnames';
import Loader from '@/components/loader/loader';
import { useDateSeparator } from './hooks/useDateSeparator';
import { useDirectChat, useDirectMessages } from '@/app/[locale]/inbox/store/hooks/useDirectChat';
import type { BotMessageResponse } from '@/app/[locale]/inbox/store/thunks/directChat';
import { uploadMediaFile } from '@/app/[locale]/create-post/store/thunks/api';
import { API_BASE_URL } from '@/app/[locale]/create-post/store/thunks/api';
import { useRenderedMessages, getReplyText } from './hooks/useRenderedMessages';
import { useMessageScroll } from './hooks/useMessageScroll';
import { useMessageInputMode } from './hooks/useMessageInputMode';
import { useReplyFromParam } from './hooks/useReplyFromParam';

interface DirectChatProps {
  onClose?: () => void;
  replyMessageId?: number;
  onReplySent?: () => void;
}

async function processMediaFiles(mediaFiles: Array<{ url?: string; file?: File }>): Promise<string[]> {
  const mediaUrls: string[] = [];
  const baseUrl = API_BASE_URL.replace('/api', '');

  for (const mediaFile of mediaFiles) {
    let mediaUrl = mediaFile.url;

    if (mediaFile.file && !mediaUrl) {
      const uploaded = await uploadMediaFile(mediaFile.file);
      mediaUrl = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
    }

    if (mediaUrl) {
      mediaUrls.push(mediaUrl);
    }
  }

  return mediaUrls;
}

const DirectChat: FC<DirectChatProps> = ({ onClose, replyMessageId, onReplySent }) => {
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
  } = useDirectChat();

  const tgChatId = activeChat?.tg_chat_id ?? 0;
  const { messages, loading, hasMore } = useDirectMessages(tgChatId);

  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const messageFieldRef = useRef<MessageFieldRef>(null);

  const isPinned = activeChat?.is_pinned ?? false;
  const isBlocked = activeChat?.is_blocked ?? false;

  const userName = activeChat?.tg_username || ''

  const inputMode = useMessageInputMode();
  const scroll = useMessageScroll({ messages, loading, hasMore, activeChat, fetchMessages });
  useReplyFromParam(replyMessageId, messages, inputMode.startReplyById);

  useEffect(() => {
    if (activeChat) {
      fetchMessages({ botId: activeChat.bot_id, tgChatId: activeChat.tg_chat_id });
    }
  }, [activeChat?.bot_id, activeChat?.tg_chat_id, fetchMessages]);

  const handleDeleteMessage = useCallback(async (messageId: number) => {
    if (!activeChat) return;
    await deleteMessage({
      messageId,
      chatId: activeChat.tg_chat_id,
    });
  }, [activeChat, deleteMessage]);

  const renderedMessages = useRenderedMessages(
    messages,
    (msg) => {
      messageFieldRef.current?.handleClearMedia();
      inputMode.startEdit(msg);
    },
    inputMode.startReply,
    handleDeleteMessage
  );

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
    messageListRef: scroll.messageListRef,
    messageRefs,
  });

  const handleSendMessage = useCallback(async () => {
    if (!activeChat) return;
    
    const { mediaFiles } = messageFieldRef.current || { mediaFiles: [] };
    const hasText = inputMode.message.trim().length > 0;
    const hasMedia = mediaFiles.length > 0;
    
    if (!hasText && !hasMedia) return;

    const replyToMessageId = inputMode.replyingTo?.id;

    try {
      if (hasMedia) {
        const mediaUrls = await processMediaFiles(mediaFiles);
        await sendMessage({
          text_content: hasText ? inputMode.message : undefined,
          media_urls: mediaUrls,
          reply_to_message_id: replyToMessageId,
        });
      } else {
        await sendMessage({
          text_content: inputMode.message,
          reply_to_message_id: replyToMessageId,
        });
      }
    } catch (error) {
      console.error('Failed to send direct message:', error);
      return;
    }
    
    const hadReply = Boolean(inputMode.replyingTo);
    
    inputMode.reset();
    messageFieldRef.current?.handleClearMedia();
    scroll.markShouldScroll();
    
    if (hadReply && onReplySent) {
      onReplySent();
    }
  }, [activeChat, inputMode, sendMessage, scroll, onReplySent]);

  const handleTogglePin = useCallback(async () => {
    if (!activeChatId) return;
    if (isPinned) {
      await unpinChat(activeChatId);
    } else {
      await pinChat(activeChatId);
    }
  }, [activeChatId, isPinned, pinChat, unpinChat]);

  const handleToggleBlock = useCallback(async () => {
    if (!activeChatId) return;
    if (isBlocked) {
      await unblockChat(activeChatId);
    } else {
      await blockChat(activeChatId);
    }
  }, [activeChatId, isBlocked, blockChat, unblockChat]);

  const handleSendOrEdit = useCallback(async () => {
    if (inputMode.editingMessage) {
      const trimmed = inputMode.message.trim();
      if (!trimmed || trimmed === inputMode.editingMessage.text) {
        inputMode.cancelEdit();
        return;
      }
      await editMessage({ messageId: inputMode.editingMessage.id, text_content: trimmed });
      inputMode.cancelEdit();
      return;
    }
    await handleSendMessage();
  }, [inputMode, editMessage, handleSendMessage]);

  return (
    <div className={styles.directChatWrapper}>
      <div className={styles.directChat}>
        <div className={styles.header}>
          <button className={styles.backButton} type="button" onClick={onClose}>
            <ChatChevronIcon width={32} height={32} />
          </button>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <span className={styles.botName}>{activeChat?.bot_username}</span>
          </div>
          <div className={styles.headerActionsWrapper}>
            <div className={styles.headerActions}>
              <button
                className={classNames(styles.iconButtonPin, { [styles.blue]: isPinned })}
                type="button"
                onClick={handleTogglePin}
              >
                <PinIcon width={16} height={16} />
              </button>
              <button
                className={classNames(styles.iconButtonBlock, { [styles.destructive]: isBlocked })}
                type="button"
                onClick={handleToggleBlock}
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
        <div className={styles.messageList} ref={scroll.messageListRef}>
          {loading && messages.length === 0 && (
            <div className={styles.loadingMessages}>
              <Loader />
            </div>
          )}
          {hasMore && <div ref={scroll.topSentinelRef} style={{ height: 1, flexShrink: 0 }} />}
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
                userPhoto={activeChat?.tg_photo_url ?? undefined}
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
          <div ref={scroll.bottomRef} />
        </div>
        {!isBlocked && (
          <MessageField
            ref={messageFieldRef}
            value={inputMode.message}
            onChange={inputMode.setMessage}
            onSendMessage={handleSendOrEdit}
            editingMessage={inputMode.editingMessage}
            onCancelEdit={inputMode.cancelEdit}
            replyingTo={inputMode.replyingTo}
            onCancelReply={inputMode.cancelReply}
          />
        )}
      </div>
    </div>
  );
};

export default DirectChat;
