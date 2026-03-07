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
  messageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export function useDateSeparator({ messages, messageListRef, messageRefs }: UseDateSeparatorProps) {
  const [visibleDate, setVisibleDate] = useState<string | null>(null);
  const [showDateSeparator, setShowDateSeparator] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const findLowestVisibleMessage = useCallback(() => {
    if (!messageListRef.current) return;

    const container = messageListRef.current;
    const containerRect = container.getBoundingClientRect();
    const viewportBottom = containerRect.bottom;

    let lowestVisibleIndex = -1;
    let lowestBottom = -Infinity;

    messageRefs.current.forEach((ref, index) => {
      if (!ref) return;
      
      const rect = ref.getBoundingClientRect();
      if (rect.top < viewportBottom && rect.bottom > containerRect.top) {
        if (rect.bottom > lowestBottom) {
          lowestBottom = rect.bottom;
          lowestVisibleIndex = index;
        }
      }
    });

    if (lowestVisibleIndex >= 0 && messages[lowestVisibleIndex]) {
      const date = formatDate(messages[lowestVisibleIndex].date);
      setVisibleDate(date);
      setShowDateSeparator(true);
    }
  }, [messages, messageListRef, messageRefs]);

  const scheduleHide = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowDateSeparator(false);
    }, 2000);
  }, []);

  useEffect(() => {
    if (!messageListRef.current) return;

    const container = messageListRef.current;
    
    // let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      findLowestVisibleMessage();
      
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      
      scrollEndTimeoutRef.current = setTimeout(() => {
        scheduleHide();
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      () => {
        findLowestVisibleMessage();
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: [0, 0.1, 0.5, 1],
      }
    );

    const timeoutId = setTimeout(() => {
      messageRefs.current.forEach((ref) => {
        if (ref) observer.observe(ref);
      });
      findLowestVisibleMessage();
    }, 100);

    return () => {
      // clearTimeout(scrollTimeout);
      clearTimeout(timeoutId);
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      container.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [findLowestVisibleMessage, scheduleHide, messages.length]);

  return {
    visibleDate,
    showDateSeparator,
  };
}
