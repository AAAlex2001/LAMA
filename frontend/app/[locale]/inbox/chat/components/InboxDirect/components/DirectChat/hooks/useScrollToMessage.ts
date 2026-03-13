import { useRef, useEffect } from 'react';
import type { DirectChatResponse } from '@/app/[locale]/inbox/store/thunks/directChat';
import type { MessageScrollReturn } from './useMessageScroll';

interface UseScrollToMessageProps {
  messageRefs: React.RefObject<Map<number, HTMLDivElement>>;
  scroll: MessageScrollReturn;
  activeChat: DirectChatResponse | null;
  fetchMessages: (params: {
    botId: number;
    tgChatId: number;
    around_message_id?: number;
    jumpToMessage?: boolean;
  }) => Promise<unknown>;
  renderedMessagesLength: number;
  highlightClassName: string;
}

export function useScrollToMessage({
  messageRefs,
  scroll,
  activeChat,
  fetchMessages,
  renderedMessagesLength,
  highlightClassName,
}: UseScrollToMessageProps) {
  const pendingScrollRef = useRef<number | null>(null);

  const scrollToAndHighlight = (el: HTMLElement) => {
    const container = scroll.messageListRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
        container.scrollTo({ top, behavior: 'auto' });

        el.classList.add(highlightClassName);
        setTimeout(() => {
          el.classList.remove(highlightClassName);
        }, 1500);
      });
    });
  };

  useEffect(() => {
    if (pendingScrollRef.current === null) return;
    const targetId = pendingScrollRef.current;
    const el = messageRefs.current?.get(targetId);
    if (el) {
      scrollToAndHighlight(el);
      pendingScrollRef.current = null;
    }
  }, [renderedMessagesLength, scrollToAndHighlight, messageRefs]);

  const scrollToMessage = async (telegramMessageId: number) => {
    const el = messageRefs.current?.get(telegramMessageId);
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

  return {
    scrollToMessage,
  };
}
