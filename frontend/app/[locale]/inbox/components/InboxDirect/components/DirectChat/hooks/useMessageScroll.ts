import { useRef, useEffect, useState, useCallback } from 'react';
import type { DirectChatResponse } from '@/app/[locale]/inbox/store/thunks/directChat';

export interface MessageScrollOpts {
  messages: Array<{ id: number; telegram_message_id?: number }>;
  loading: boolean;
  hasMore: boolean;
  activeChat: DirectChatResponse | null;
  fetchMessages: (params: {
    botId: number;
    tgChatId: number;
    skip?: number;
    limit?: number;
    around_message_id?: number;
  }) => Promise<unknown>;
  isDetached?: boolean;
  onJumpToLatest?: () => void;
}

export interface MessageScrollReturn {
  messageListRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  markShouldScroll: () => void;
  isBottomVisible: boolean;
  scrollToBottom: () => void;
  resetInitialScroll: () => void;
}

export function useMessageScroll({
  messages,
  loading,
  hasMore,
  activeChat,
  fetchMessages,
  isDetached = false,
  onJumpToLatest,
}: MessageScrollOpts): MessageScrollReturn {
  const messageListRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const shouldScrollAfterSendRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const didInitialScrollRef = useRef(false);
  const [isBottomVisible, setIsBottomVisible] = useState(true);

  const checkBottomRef = useRef(() => {});
  checkBottomRef.current = () => {
    const el = messageListRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    isNearBottomRef.current = nearBottom;
    setIsBottomVisible(nearBottom);
  };

  // Detect when user is near the bottom of the list
  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;

    const handleScroll = () => checkBottomRef.current();

    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
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
        }
      },
      { root: el, rootMargin: '200px 0px 0px 0px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, activeChat, messages.length, fetchMessages, isDetached]);

  // Reset on chat change
  useEffect(() => {
    didInitialScrollRef.current = false;
    isNearBottomRef.current = true;
    shouldScrollAfterSendRef.current = false;
  }, [activeChat?.tg_chat_id]);

  const prevDetachedRef = useRef(isDetached);
  useEffect(() => {
    if (prevDetachedRef.current && !isDetached) {
      didInitialScrollRef.current = false;
    }
    prevDetachedRef.current = isDetached;
  }, [isDetached]);

  // Initial scroll to bottom (skip when detached — useReplyFromParam handles positioning)
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
        checkBottomRef.current();
      });
    }
  }, [loading, messages.length, activeChat?.tg_chat_id, isDetached]);

  const newestMessageId = messages.length > 0 ? messages[0]?.id : undefined;
  useEffect(() => {
    if (!didInitialScrollRef.current) return;
    const el = messageListRef.current;
    if (!el) return;

    if (!loading && newestMessageId && (isNearBottomRef.current || shouldScrollAfterSendRef.current)) {
      el.scrollTop = el.scrollHeight;
      shouldScrollAfterSendRef.current = false;
      requestAnimationFrame(() => checkBottomRef.current());
    }
  }, [newestMessageId, loading]);

  const markShouldScroll = () => {
    shouldScrollAfterSendRef.current = true;
  };

  const resetInitialScroll = useCallback(() => {
    didInitialScrollRef.current = false;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (isDetached && onJumpToLatest) {
      onJumpToLatest();
      return;
    }
    const el = messageListRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [isDetached, onJumpToLatest]);

  return {
    messageListRef,
    bottomRef,
    topSentinelRef,
    markShouldScroll,
    isBottomVisible,
    scrollToBottom,
    resetInitialScroll,
  };
}
