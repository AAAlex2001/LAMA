import { useRef, useEffect } from 'react';
import type { DirectChatResponse } from '@/app/[locale]/inbox/store/thunks/directChat';

export interface MessageScrollOpts {
  messages: Array<{ id: number }>;
  loading: boolean;
  hasMore: boolean;
  activeChat: DirectChatResponse | null;
  fetchMessages: (params: { botId: number; tgChatId: number; skip?: number; limit?: number }) => Promise<unknown>;
}

export interface MessageScrollReturn {
  messageListRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  topSentinelRef: React.RefObject<HTMLDivElement>;
  markShouldScroll: () => void;
}

export function useMessageScroll({
  messages,
  loading,
  hasMore,
  activeChat,
  fetchMessages,
}: MessageScrollOpts): MessageScrollReturn {
  const messageListRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const shouldScrollAfterSendRef = useRef(false);
  const loadingMoreRef = useRef(false);

  // Bottom observer to track if user is near bottom
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

  // Top sentinel for infinite scroll
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

  // Scroll after send or when new messages arrive
  const lastMessageId = messages[0]?.id;
  useEffect(() => {
    if (!loading && lastMessageId && (isNearBottomRef.current || shouldScrollAfterSendRef.current)) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      shouldScrollAfterSendRef.current = false;
    }
  }, [lastMessageId, loading]);

  const markShouldScroll = () => {
    shouldScrollAfterSendRef.current = true;
  };

  return {
    messageListRef,
    bottomRef,
    topSentinelRef,
    markShouldScroll,
  };
}
