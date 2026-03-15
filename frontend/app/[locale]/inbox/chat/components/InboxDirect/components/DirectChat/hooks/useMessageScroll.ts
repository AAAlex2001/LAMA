import { useRef, useEffect } from 'react';
import type { DirectChatResponse } from '@/app/[locale]/inbox/store/thunks/directChat';
import { useInView } from '@/app/[locale]/calendar/store/useInView';

export interface MessageScrollOpts {
  messages: Array<{ id: number; telegram_message_id?: number }>;
  loading: boolean;
  hasMore: boolean;
  hasNewer: boolean;
  activeChat: DirectChatResponse | null;
  fetchMessages: (params: {
    botId: number;
    tgChatId: number;
    skip?: number;
    limit?: number;
    around_message_id?: number;
    after_message_id?: number;
  }) => Promise<unknown>;
  isDetached?: boolean;
  onJumpToLatest?: () => void;
}

export interface MessageScrollReturn {
  messageListRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: (node?: Element | null) => void;
  topSentinelRef: (node?: Element | null) => void;
  bottomSentinelRef: (node?: Element | null) => void;
  markShouldScroll: () => void;
  isBottomVisible: boolean;
  scrollToBottom: () => void;
  resetInitialScroll: () => void;
}

export function useMessageScroll({
  messages,
  loading,
  hasMore,
  hasNewer,
  activeChat,
  fetchMessages,
  isDetached = false,
  onJumpToLatest,
}: MessageScrollOpts): MessageScrollReturn {
  const messageListRef = useRef<HTMLDivElement>(null);
  const shouldScrollAfterSendRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const didInitialScrollRef = useRef(false);

  const { ref: bottomRef, inView: isBottomVisible } = useInView({
    root: messageListRef.current,
    rootMargin: '0px 0px 50px 0px',
    threshold: 0,
    initialInView: true,
  });

  const isBottomVisibleRef = useRef(true);
  isBottomVisibleRef.current = isBottomVisible;

  const { ref: topSentinelRef } = useInView({
    root: messageListRef.current,
    rootMargin: '500px 0px 0px 0px',
    threshold: 0,
    skip: !hasMore || !activeChat,
    onChange: (inView) => {
      if (!inView || loading || loadingMoreRef.current || !activeChat) return;

      loadingMoreRef.current = true;
      const el = messageListRef.current;
      if (!el) {
        loadingMoreRef.current = false;
        return;
      }
      const prevScrollHeight = el.scrollHeight;

      const fetchParams = isDetached
        ? (() => {
            const oldestMsg = messages[messages.length - 1];
            const aroundId = oldestMsg?.telegram_message_id;
            if (!aroundId) return null;
            return {
              botId: activeChat.bot_id,
              tgChatId: activeChat.tg_chat_id,
              around_message_id: aroundId,
            };
          })()
        : {
            botId: activeChat.bot_id,
            tgChatId: activeChat.tg_chat_id,
            skip: messages.length,
            limit: 50,
          };

      if (!fetchParams) {
        loadingMoreRef.current = false;
        return;
      }

      fetchMessages(fetchParams).then(() => {
        requestAnimationFrame(() => {
          const newScrollHeight = el.scrollHeight;
          el.scrollTop = newScrollHeight - prevScrollHeight;
          loadingMoreRef.current = false;
        });
      });
    },
  });

  const loadingNewerRef = useRef(false);
  const newerFetchReadyRef = useRef(false);

  useEffect(() => {
    if (!isDetached) {
      newerFetchReadyRef.current = false;
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        newerFetchReadyRef.current = true;
      });
    });
    return () => {
      cancelAnimationFrame(id);
      newerFetchReadyRef.current = false;
    };
  }, [isDetached]);

  const { ref: bottomSentinelRef } = useInView({
    root: messageListRef.current,
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
    skip: !isDetached || !hasNewer || !activeChat,
    onChange: (inView) => {
      if (!inView || loading || loadingNewerRef.current || !activeChat || !newerFetchReadyRef.current) return;

      const newestMsg = messages[0];
      const afterId = newestMsg?.telegram_message_id;
      if (!afterId) return;

      loadingNewerRef.current = true;
      fetchMessages({
        botId: activeChat.bot_id,
        tgChatId: activeChat.tg_chat_id,
        after_message_id: afterId,
        limit: 50,
      }).then(() => {
        loadingNewerRef.current = false;
      });
    },
  });

  useEffect(() => {
    didInitialScrollRef.current = false;
    shouldScrollAfterSendRef.current = false;
  }, [activeChat?.bot_id, activeChat?.tg_chat_id]);

  const prevDetachedRef = useRef(isDetached);
  useEffect(() => {
    if (prevDetachedRef.current && !isDetached) {
      didInitialScrollRef.current = false;
    }
    prevDetachedRef.current = isDetached;
  }, [isDetached]);

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;

    if (!loading && messages.length > 0 && !didInitialScrollRef.current) {
      if (isDetached) {
        didInitialScrollRef.current = true;
        return;
      }
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        didInitialScrollRef.current = true;
      });
    }
  }, [loading, messages.length, activeChat?.bot_id, activeChat?.tg_chat_id, isDetached]);

  const newestMessageId = messages.length > 0 ? messages[0]?.id : undefined;
  useEffect(() => {
    if (!didInitialScrollRef.current) return;
    const el = messageListRef.current;
    if (!el) return;

    if (!loading && newestMessageId && (isBottomVisibleRef.current || shouldScrollAfterSendRef.current)) {
      el.scrollTop = el.scrollHeight;
      shouldScrollAfterSendRef.current = false;
    }
  }, [newestMessageId, loading]);

  const markShouldScroll = () => {
    shouldScrollAfterSendRef.current = true;
  };

  const resetInitialScroll = () => {
    didInitialScrollRef.current = false;
  };

  const scrollToBottom = () => {
    if (isDetached && onJumpToLatest) {
      onJumpToLatest();
      return;
    }
    const el = messageListRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  };

  return {
    messageListRef,
    bottomRef,
    topSentinelRef,
    bottomSentinelRef,
    markShouldScroll,
    isBottomVisible,
    scrollToBottom,
    resetInitialScroll,
  };
}
