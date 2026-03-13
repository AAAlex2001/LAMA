import type { RenderedMessageGroup } from './useRenderedMessages';

export function useReplyTextLookup(renderedMessages: RenderedMessageGroup[]) {

  const lookup = () => {
    const map = new Map<number, string>();
    renderedMessages.forEach((msg) => {
      map.set(msg.telegramMessageId, msg.text || (msg.mediaItems ? 'Медиа' : ''));
    });
    return map;
  };
  return lookup();
}
