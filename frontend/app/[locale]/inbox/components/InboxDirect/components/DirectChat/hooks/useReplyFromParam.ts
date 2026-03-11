import { useEffect, useRef } from 'react';
import type { BotMessageResponse } from '@/app/[locale]/inbox/store/thunks/directChat';

export function useReplyFromParam(
  replyMessageId: number | undefined,
  messages: BotMessageResponse[],
  startReplyById: (telegramMessageId: number, messages: BotMessageResponse[]) => void,
  scrollToMessage: (telegramMessageId: number) => void,
  /** Pass renderedMessages.length — ensures DOM refs are populated before scrolling */
  renderedCount: number,
) {
  const processedReplyMessageIdRef = useRef<number | null>(null);
  const scrollToMessageRef = useRef(scrollToMessage);
  scrollToMessageRef.current = scrollToMessage;

  useEffect(() => {
    if (!replyMessageId) {
      processedReplyMessageIdRef.current = null;
      return;
    }

    if (processedReplyMessageIdRef.current === replyMessageId) {
      return;
    }

    if (renderedCount > 0) {
      startReplyById(replyMessageId, messages);
      scrollToMessageRef.current(replyMessageId);
      processedReplyMessageIdRef.current = replyMessageId;
    }
  }, [replyMessageId, renderedCount, startReplyById, messages]);
}
