import { useEffect, useRef } from 'react';
import type { BotMessageResponse } from '@/app/[locale]/inbox/store/thunks/directChat';

export function useReplyFromParam(
  replyMessageId: number | undefined,
  messages: BotMessageResponse[],
  startReplyById: (telegramMessageId: number, messages: BotMessageResponse[]) => void,
) {
  const processedReplyMessageIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset ref when replyMessageId changes or is cleared
    if (!replyMessageId) {
      processedReplyMessageIdRef.current = null;
      return;
    }

    // Skip if already processed
    if (processedReplyMessageIdRef.current === replyMessageId) {
      return;
    }

    if (messages.length > 0) {
      startReplyById(replyMessageId, messages);
      processedReplyMessageIdRef.current = replyMessageId;
    }
  }, [replyMessageId, messages.length, startReplyById]);
}
