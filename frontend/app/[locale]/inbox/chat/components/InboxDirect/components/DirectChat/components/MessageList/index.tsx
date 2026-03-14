import React, { FC, RefObject, useMemo, useCallback, memo } from 'react';
import Loader from '@/components/loader/loader';
import { Button } from '@/components/new-button';
import { ChevronDownIcon } from '@/components/icons';
import MessageElement from '../MessageElement';
import type { ReplyToInfo } from '../MessageElement';
import styles from '../../styles.module.scss';
import type { RenderedMessageGroup } from '../../hooks/useRenderedMessages';
import type { MessageScrollReturn } from '../../hooks/useMessageScroll';

interface MessageRowProps {
  msg: RenderedMessageGroup;
  messageRefs: RefObject<Map<number, HTMLDivElement>>;
  replyTextLookup: Map<number, string>;
  userPhoto?: string;
  scrollToMessage: (telegramMessageId: number) => Promise<void>;
}

const MessageRow = memo<MessageRowProps>(({ msg, messageRefs, replyTextLookup, userPhoto, scrollToMessage }) => {
  const replyTo: ReplyToInfo | undefined = useMemo(() => {
    if (!msg.replyToMessageId) return undefined;
    const text = replyTextLookup.get(msg.replyToMessageId) || msg.replyMessageText || 'Сообщение';
    return {
      text,
      onClick: () => scrollToMessage(msg.replyToMessageId!),
    };
  }, [msg.replyToMessageId, msg.replyMessageText, replyTextLookup, scrollToMessage]);

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) messageRefs.current?.set(msg.telegramMessageId, el);
      else messageRefs.current?.delete(msg.telegramMessageId);
    },
    [messageRefs, msg.telegramMessageId],
  );

  return (
    <div ref={setRef}>
      <MessageElement
        type={msg.type}
        text={msg.text}
        messageId={msg.telegramMessageId}
        mediaItems={msg.mediaItems}
        time={msg.time}
        userPhoto={userPhoto}
        replyTo={replyTo}
        onEdit={msg.onEdit}
        onReply={msg.onReply}
        onDelete={msg.onDelete}
      />
    </div>
  );
});
MessageRow.displayName = 'MessageRow';

interface MessageListProps {
  renderedMessages: RenderedMessageGroup[];
  loading: boolean;
  hasMore: boolean;
  messageRefs: RefObject<Map<number, HTMLDivElement>>;
  scroll: MessageScrollReturn;
  replyTextLookup: Map<number, string>;
  userPhoto?: string;
  scrollToMessage: (telegramMessageId: number) => Promise<void>;
}

const MessageList: FC<MessageListProps> = ({
  renderedMessages,
  loading,
  hasMore,
  messageRefs,
  scroll,
  replyTextLookup,
  userPhoto,
  scrollToMessage,
}) => {
  return (
    <div className={styles.messageListWrapper}>
      <div className={styles.messageList} ref={scroll.messageListRef}>
        {loading && renderedMessages.length === 0 && (
          <div className={styles.loadingMessages}>
            <Loader />
          </div>
        )}
        {hasMore && <div ref={scroll.topSentinelRef as React.Ref<HTMLDivElement>} style={{ height: 1, flexShrink: 0 }} />}
        {loading && renderedMessages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', flexShrink: 0 }}>
            <Loader size={20} />
          </div>
        )}
        {!loading && renderedMessages.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <h3 className={styles.emptyStateTitle}>Сообщений пока нет</h3>
              <p className={styles.emptyStateSubtitle}>Выберите один из чатов в списке</p>
            </div>
          </div>
        )}
        {renderedMessages.map((msg) => (
          <MessageRow
            key={msg.id}
            msg={msg}
            messageRefs={messageRefs}
            replyTextLookup={replyTextLookup}
            userPhoto={userPhoto}
            scrollToMessage={scrollToMessage}
          />
        ))}
        <div ref={scroll.bottomRef as React.Ref<HTMLDivElement>} style={{ height: 1, flexShrink: 0 }} />
      </div>
      {!scroll.isBottomVisible && renderedMessages.length > 0 && (
        <div className={styles.scrollToBottomButtonWrapper}>
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
    </div>
  );
};

export default MessageList;
