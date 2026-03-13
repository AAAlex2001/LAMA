'use client';

import { useRef, useEffect, type FC } from 'react';
import styles from './styles.module.scss';
import MessageField, { type MessageFieldRef } from './components/MessageField';
import Header from './components/Header';
import MessageList from './components/MessageList';
import { useDateSeparator } from './hooks/useDateSeparator';
import { useDirectChat, useDirectMessages } from '@/app/[locale]/inbox/store/hooks/useDirectChat';
import { useRenderedMessages } from './hooks/useRenderedMessages';
import { useMessageScroll } from './hooks/useMessageScroll';
import { useMessageInputMode } from './hooks/useMessageInputMode';
import { useReplyFromParam } from './hooks/useReplyFromParam';
import { useChatActions } from './hooks/useChatActions';
import { useMessageSending } from './hooks/useMessageSending';
import { useScrollToMessage } from './hooks/useScrollToMessage';
import { useReplyTextLookup } from './hooks/useReplyTextLookup';

interface DirectChatProps {
  onClose?: () => void;
  replyMessageId?: number;
  onReplySent?: () => void;
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

  const { messages, loading, hasMore, isDetached } = useDirectMessages(activeChatId || "0_0");

  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const messageFieldRef = useRef<MessageFieldRef>(null);

  const isPinned = activeChat?.is_pinned ?? false;
  const isBlocked = activeChat?.is_blocked ?? false;
  const userName = activeChat?.tg_username || activeChat?.tg_first_name || '';

  const inputMode = useMessageInputMode(activeChatId);

  const handleJumpToLatest = () => {
    jumpToLatest();
  };

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
  }, [activeChat?.bot_id, activeChat?.tg_chat_id ]);

  const { handleTogglePin, handleToggleBlock, handleDeleteMessage } = useChatActions({
    activeChat,
    pinChat,
    unpinChat,
    blockChat,
    unblockChat,
    deleteMessage,
  });

  const renderedMessages = useRenderedMessages(
    messages,
    (msg) => {
      messageFieldRef.current?.handleClearMedia();
      inputMode.startEdit(msg);
    },
    inputMode.startReply,
    handleDeleteMessage
  );

  const replyTextLookup = useReplyTextLookup(renderedMessages);

  const { scrollToMessage } = useScrollToMessage({
    messageRefs,
    scroll,
    activeChat,
    fetchMessages,
    renderedMessagesLength: renderedMessages.length,
    highlightClassName: styles.messageHighlight,
  });

  useReplyFromParam(replyMessageId, messages, inputMode.startReplyById, scrollToMessage, renderedMessages.length);

  const { visibleDate, showDateSeparator } = useDateSeparator({
    messages: renderedMessages,
    messageListRef: scroll.messageListRef,
    messageRefs,
  });

  const { handleSendOrEdit } = useMessageSending({
    activeChat,
    messageFieldRef,
    inputMode,
    sendMessage,
    editMessage,
    scroll,
    isDetached,
    onJumpToLatest: handleJumpToLatest,
    onReplySent,
  });

  return (
    <div className={styles.directChatWrapper}>
      <div className={styles.directChat}>
        <Header
          userName={userName}
          botName={activeChat?.bot_username ?? undefined}
          isPinned={isPinned}
          isBlocked={isBlocked}
          onClose={onClose}
          onTogglePin={handleTogglePin}
          onToggleBlock={handleToggleBlock}
        />
        {showDateSeparator && visibleDate && (
          <div className={styles.dateSeparator}>
            <span>{visibleDate}</span>
          </div>
        )}
        <MessageList
          renderedMessages={renderedMessages}
          loading={loading}
          hasMore={hasMore}
          messageRefs={messageRefs}
          scroll={scroll}
          replyTextLookup={replyTextLookup}
          userPhoto={activeChat?.tg_photo_url ?? undefined}
          scrollToMessage={scrollToMessage}
        />
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
