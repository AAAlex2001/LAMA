'use client';

import { useRef, useEffect, useMemo, useCallback, FC } from 'react';
import styles from './styles.module.scss';
import MessageElement from './components/MessageElement';
import MessageField, { type MessageFieldRef } from './components/MessageField';
import { BlockedIcon, ChatChevronIcon, PinIcon, ChevronDownIcon } from '@/components/icons';
import classNames from 'classnames';
import Loader from '@/components/loader/loader';
import { useDateSeparator } from './hooks/useDateSeparator';
import { useDirectChat, useDirectMessages } from '@/app/[locale]/inbox/store/hooks/useDirectChat';
import { uploadMediaFile } from '@/app/[locale]/create-post/store/thunks/api';
import { API_BASE_URL } from '@/app/[locale]/create-post/store/thunks/api';
import { useRenderedMessages } from './hooks/useRenderedMessages';
import { useMessageScroll } from './hooks/useMessageScroll';
import { useMessageInputMode } from './hooks/useMessageInputMode';
import { useReplyFromParam } from './hooks/useReplyFromParam';
import { Button } from '@/components/new-button';

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
    jumpToLatest,
    fetchChats,
  } = useDirectChat();

  const tgChatId = activeChat?.tg_chat_id ?? 0;
  const { messages, loading, hasMore, isDetached } = useDirectMessages(tgChatId);

  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const messageFieldRef = useRef<MessageFieldRef>(null);

  const isPinned = activeChat?.is_pinned ?? false;
  const isBlocked = activeChat?.is_blocked ?? false;

  const userName = activeChat?.tg_username || ''

  const inputMode = useMessageInputMode(activeChatId);

  const handleJumpToLatest = useCallback(() => {
    jumpToLatest();
  }, [jumpToLatest]);

  const scroll = useMessageScroll({
    messages,
    loading,
    hasMore,
    activeChat,
    fetchMessages,
    isDetached,
    onJumpToLatest: handleJumpToLatest,
  });

  useEffect(() => {
    if (activeChat) {
      if (replyMessageId) {
        fetchMessages({
          botId: activeChat.bot_id,
          tgChatId: activeChat.tg_chat_id,
          around_message_id: replyMessageId,
          jumpToMessage: true,
        });
        fetchChats({}); 
      } else {
        fetchMessages({ botId: activeChat.bot_id, tgChatId: activeChat.tg_chat_id });
        fetchChats({});
      }
    }
  }, [activeChat?.bot_id, activeChat?.tg_chat_id, fetchMessages, fetchChats]);

  const handleDeleteMessage = async (messageId: number) => {
    if (!activeChat) return;
    await deleteMessage({
      messageId,
      chatId: activeChat.tg_chat_id,
    });
  };

  const renderedMessages = useRenderedMessages(
    messages,
    (msg) => {
      messageFieldRef.current?.handleClearMedia();
      inputMode.startEdit(msg);
    },
    inputMode.startReply,
    handleDeleteMessage
  );

  const replyTextLookup = useMemo(() => {
    const map = new Map<number, string>();
    renderedMessages.forEach((msg) => {
      map.set(msg.telegramMessageId, msg.text || (msg.mediaItems ? 'Медиа' : ''));
    });
    return map;
  }, [renderedMessages]);

  const scrollToAndHighlight = useCallback((el: HTMLElement) => {
    const container = scroll.messageListRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
        container.scrollTo({ top, behavior: 'smooth' });

        el.classList.add(styles.messageHighlight);
        setTimeout(() => {
          el.classList.remove(styles.messageHighlight);
        }, 1500);
      });
    });
  }, [scroll.messageListRef]);

  const pendingScrollRef = useRef<number | null>(null);

  useEffect(() => {
    if (pendingScrollRef.current === null) return;
    const targetId = pendingScrollRef.current;
    const el = messageRefs.current.get(targetId);
    if (el) {
      scrollToAndHighlight(el);
      pendingScrollRef.current = null;
    }
  }, [renderedMessages, scrollToAndHighlight]);

  const scrollToMessage = async (telegramMessageId: number) => {
    const el = messageRefs.current.get(telegramMessageId);
    if (el) {
      scrollToAndHighlight(el);
      return;
    }

    if (!activeChat) return;
    pendingScrollRef.current = telegramMessageId;
    await fetchMessages({
      botId: activeChat.bot_id,
      tgChatId: activeChat.tg_chat_id,
      around_message_id: telegramMessageId,
      jumpToMessage: true,
    });
  };

  useReplyFromParam(replyMessageId, messages, inputMode.startReplyById, scrollToMessage, renderedMessages.length);

  const { visibleDate, showDateSeparator } = useDateSeparator({
    messages: renderedMessages,
    messageListRef: scroll.messageListRef,
    messageRefs,
  });

  const handleSendMessage = async () => {
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

    if (isDetached) {
      handleJumpToLatest();
    } else {
      scroll.markShouldScroll();
    }

    if (hadReply && onReplySent) {
      onReplySent();
    }
  };

  const handleTogglePin = async () => {
    if (!activeChatId) return;
    if (isPinned) {
      await unpinChat(activeChatId);
    } else {
      await pinChat(activeChatId);
    }
  };

  const handleToggleBlock = async () => {
    if (!activeChatId) return;
    if (isBlocked) {
      await unblockChat(activeChatId);
    } else {
      await blockChat(activeChatId);
    }
  };

  const handleSendOrEdit = async () => {
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
  };

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
          {renderedMessages.map((msg) => (
            <div
              key={msg.id}
              ref={(el) => {
                if (el) messageRefs.current.set(msg.telegramMessageId, el);
                else messageRefs.current.delete(msg.telegramMessageId);
              }}
            >
              <MessageElement
                type={msg.type}
                text={msg.text}
                mediaItems={msg.mediaItems}
                time={msg.time}
                userPhoto={activeChat?.tg_photo_url ?? undefined}
                replyTo={msg.replyToMessageId ? (() => {
                  const text = replyTextLookup.get(msg.replyToMessageId!) || msg.replyMessageText || 'Сообщение';
                  return {
                    text,
                    onClick: () => scrollToMessage(msg.replyToMessageId!),
                  };
                })() : undefined}
                onEdit={msg.onEdit}
                onReply={msg.onReply}
                onDelete={msg.onDelete}
              />
            </div>
          ))}
          <div ref={scroll.bottomRef} />
        </div>
        {!scroll.isBottomVisible && renderedMessages.length > 0 && (
          <div
            className={styles.scrollToBottomButtonWrapper}
          >
            <Button
              variant="fill"
              intent="gradient"
              size="sm"
              onClick={scroll.scrollToBottom}
              className={styles.scrollToBottomButton}
            >
              <ChevronDownIcon width={20} height={20} color="white" />
            </Button>
          </div>
        )}
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
