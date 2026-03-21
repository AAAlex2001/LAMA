
import type { DirectChatResponse, EditDirectMessageParams, MessageType, SendDirectMessageParams } from '@/app/[locale]/inbox/store/thunks/directChat';
import type { MessageFieldRef } from '../components/MessageField';
import type { MessageInputModeReturn } from './useMessageInputMode';
import type { MessageScrollReturn } from './useMessageScroll';
import { buildInlineKeyboard } from '@/store/utils';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { processMediaFiles } from '../utils/processMediaFiles';

interface UseMessageSendingProps {
  activeChat: DirectChatResponse | null;
  messageFieldRef: React.RefObject<MessageFieldRef | null>;
  inputMode: MessageInputModeReturn;
  sendMessage: (params: {
    text_content?: string;
    media_url?: string;
    media_urls?: string[];
    media_file_ids?: string[];
    media_type?: MessageType;
    inline_keyboard?: SendDirectMessageParams['inline_keyboard'];
    buttons?: SendDirectMessageParams['buttons'];
    reply_to_message_id?: number;
  }) => Promise<unknown>;
  editMessage: (params: EditDirectMessageParams) => unknown;
  scroll: MessageScrollReturn;
  isDetached: boolean;
  onJumpToLatest: () => void;
  onReplySent?: () => void;
}

export function useMessageSending({
  activeChat,
  messageFieldRef,
  inputMode,
  sendMessage,
  editMessage,
  scroll,
  isDetached,
  onJumpToLatest,
  onReplySent,
}: UseMessageSendingProps) {
  const { showError } = useNotifications();

  const handleSendMessage = async () => {
    if (!activeChat) return;

    const { mediaFiles, inlineButtonRows } = messageFieldRef.current || { mediaFiles: [], inlineButtonRows: [] };
    const hasText = inputMode.message.trim().length > 0;
    const hasMedia = mediaFiles.length > 0;

    if (!hasText && !hasMedia) return;

    const replyToMessageId = inputMode.replyingTo?.id;
    const inlineKeyboard = buildInlineKeyboard(inlineButtonRows);

    try {
      if (hasMedia) {
        const { urls: mediaUrls, fileIds: mediaFileIds } = await processMediaFiles(mediaFiles);
        await sendMessage({
          text_content: hasText ? inputMode.message : undefined,
          media_urls: mediaUrls,
          media_file_ids: mediaFileIds.length > 0 ? mediaFileIds : undefined,
          reply_to_message_id: replyToMessageId,
          inline_keyboard: inlineKeyboard,
          buttons: inlineKeyboard,
        });
      } else {
        await sendMessage({
          text_content: inputMode.message,
          reply_to_message_id: replyToMessageId,
          inline_keyboard: inlineKeyboard,
          buttons: inlineKeyboard,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось отправить сообщение';
      showError(errorMessage);
      return;
    }

    const hadReply = Boolean(inputMode.replyingTo);

    inputMode.reset();
    messageFieldRef.current?.handleClearMedia();
    messageFieldRef.current?.handleResetInlineButtons();

    if (isDetached) {
      onJumpToLatest();
    } else {
      scroll.markShouldScroll();
    }

    if (hadReply && onReplySent) {
      onReplySent();
    }
  };

  const handleSendOrEdit = async () => {
    if (inputMode.editingMessage) {
      const trimmed = inputMode.message.trim();
      if (!trimmed || trimmed === inputMode.editingMessage.text) {
        inputMode.cancelEdit();
        return;
      }
      if (!activeChat) return;
      await editMessage({ messageId: inputMode.editingMessage.id, botId: activeChat?.bot_id, chatId: activeChat?.tg_chat_id, text_content: trimmed });
      inputMode.cancelEdit();
      return;
    }
    await handleSendMessage();
  };

  return {
    handleSendMessage,
    handleSendOrEdit,
  };
}
