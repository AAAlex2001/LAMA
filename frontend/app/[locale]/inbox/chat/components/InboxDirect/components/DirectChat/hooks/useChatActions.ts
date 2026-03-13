import type { DirectChatResponse } from '@/app/[locale]/inbox/store/thunks/directChat';

interface UseChatActionsProps {
  activeChat: DirectChatResponse | null;
  pinChat: (chatId: number) => unknown;
  unpinChat: (chatId: number) => unknown;
  blockChat: (chatId: number) => unknown;
  unblockChat: (chatId: number) => unknown;
  deleteMessage: (params: { messageId: number; botId: number; chatId: number }) => unknown;
}

export function useChatActions({
  activeChat,
  pinChat,
  unpinChat,
  blockChat,
  unblockChat,
  deleteMessage,
}: UseChatActionsProps) {
  const handleTogglePin = async () => {
    if (!activeChat) return;
    if (activeChat.is_pinned) {
      await unpinChat(activeChat.id);
    } else {
      await pinChat(activeChat.id);
    }
  };

  const handleToggleBlock = async () => {
    if (!activeChat) return;
    if (activeChat.is_blocked) {
      await unblockChat(activeChat.id);
    } else {
      await blockChat(activeChat.id);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!activeChat) return;
    await deleteMessage({
      messageId,
      botId: activeChat.bot_id,
      chatId: activeChat.tg_chat_id,
    });
  };

  return {
    handleTogglePin,
    handleToggleBlock,
    handleDeleteMessage,
  };
}
