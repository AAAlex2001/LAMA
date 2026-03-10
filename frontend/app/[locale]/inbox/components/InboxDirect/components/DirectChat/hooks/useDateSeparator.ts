'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

function formatDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.getTime() === today.getTime()) {
    return 'Сегодня';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Вчера';
  } else {
    const day = String(messageDate.getDate()).padStart(2, '0');
    const month = String(messageDate.getMonth() + 1).padStart(2, '0');
    const year = messageDate.getFullYear();
    return `${day}.${month}.${year}`;
  }
}

interface UseDateSeparatorProps {
  messages: Array<{ date: Date }>;
  messageListRef: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>;
  messageRefs: React.RefObject<(HTMLDivElement | null)[]>;
}

export function useDateSeparator({ messages, messageListRef, messageRefs }: UseDateSeparatorProps) {
  const [visibleDate, setVisibleDate] = useState<string | null>(null);
  const [showDateSeparator, setShowDateSeparator] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const findTopVisibleMessage = useCallback(() => {
    if (!messageListRef.current) return null;

    const container = messageListRef.current;
    const containerRect = container.getBoundingClientRect();

    let topVisibleIndex = -1;
    let topmost = Infinity;

    messageRefs.current.forEach((ref, index) => {
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      if (rect.top < containerRect.bottom && rect.bottom > containerRect.top) {
        if (rect.top < topmost) {
          topmost = rect.top;
          topVisibleIndex = index;
        }
      }
    });

    if (topVisibleIndex >= 0 && messages[topVisibleIndex]) {
      return formatDate(messages[topVisibleIndex].date);
    }

    return null;
  }, [messages, messageListRef, messageRefs]);

  useEffect(() => {
    if (!messageListRef.current) return;

    const container = messageListRef.current;

    const handleScroll = () => {
      const date = findTopVisibleMessage();
      if (date) {
        setVisibleDate(date);
      }

      setShowDateSeparator(true);

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      hideTimeoutRef.current = setTimeout(() => {
        setShowDateSeparator(false);
      }, 1200);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [findTopVisibleMessage]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return {
    visibleDate,
    showDateSeparator,
  };
}
