import { FC, RefObject } from 'react';
import Loader from '@/components/loader/loader';
import { Button } from '@/components/new-button';
import { ChevronDownIcon } from '@/components/icons';
import MessageElement from '../MessageElement';
import styles from '../../styles.module.scss';
import type { RenderedMessageGroup } from '../../hooks/useRenderedMessages';
import type { MessageScrollReturn } from '../../hooks/useMessageScroll';

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
        {hasMore && <div ref={scroll.topSentinelRef} style={{ height: 1, flexShrink: 0 }} />}
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
          <div
            key={msg.id}
            ref={(el) => {
              if (el) messageRefs.current?.set(msg.telegramMessageId, el);
              else messageRefs.current?.delete(msg.telegramMessageId);
            }}
          >
            <MessageElement
              type={msg.type}
              text={msg.text}
              mediaItems={msg.mediaItems}
              time={msg.time}
              userPhoto={userPhoto}
              replyTo={
                msg.replyToMessageId
                  ? (() => {
                      const text = replyTextLookup.get(msg.replyToMessageId!) || msg.replyMessageText || 'Сообщение';
                      return {
                        text,
                        onClick: () => scrollToMessage(msg.replyToMessageId!),
                      };
                    })()
                  : undefined
              }
              onEdit={msg.onEdit}
              onReply={msg.onReply}
              onDelete={msg.onDelete}
            />
          </div>
        ))}
        <div ref={scroll.bottomRef} style={{ height: 1, flexShrink: 0 }} />
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
