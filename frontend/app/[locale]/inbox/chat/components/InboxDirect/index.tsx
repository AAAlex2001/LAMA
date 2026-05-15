'use client'

import styles from './styles.module.scss';
import DirectChat from "./components/DirectChat";
import DirectMenu from "./components/DirectMenu";
import { DesktopWrapper, MobileWrapper } from '@/components/responsive-wrappers';
import { useDirectChat } from '@/[locale]/inbox/store/hooks/useDirectChat';
import { makeChatKey } from '@/[locale]/inbox/store/slices/directChat';
import { createDirectChatThunk } from '@/[locale]/inbox/store/thunks/directChat';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';

const InboxDirect = ( { onClose, isReady = true }: { onClose: () => void; isReady?: boolean } ) => {
  const {
    activeChatId,
    chatsById,
    chatOrder,
    chatsLoading,
    setActiveChat,
    fetchChats,
    createChat,
    chatsError,
  } = useDirectChat();

  const creatingChatRef = useRef(false);

  const router = useRouter();
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const initialParamsProcessedRef = useRef(false);
  const { showError } = useNotifications();

  const messageId = searchParams?.get('message_id');
  const messageIdNumber = messageId ? parseInt(messageId, 10) : undefined;
  const botIdParam = searchParams?.get('bot_id');
  const botIdNumber = botIdParam ? parseInt(botIdParam, 10) : undefined;
  const chatIdParam = searchParams?.get('chat_id');
  const tgChatId = chatIdParam ? parseInt(chatIdParam, 10) : undefined;

  useEffect(() => {
    if (!chatsError) return;
    showError(chatsError);
  }, [chatsError]);

  useEffect(() => {
    if (!isReady) return;
    if (initialParamsProcessedRef.current) return;
    if (!tgChatId || !botIdNumber) return;

    if (chatOrder.length === 0 && !chatsLoading) {
      fetchChats({});
      return;
    }

    if (chatOrder.length > 0 && !chatsLoading) {
      const chatKey = makeChatKey(botIdNumber, tgChatId);
      if (chatsById[chatKey]) {
        initialParamsProcessedRef.current = true;
        setActiveChat(chatKey);
        return;
      }

      if (creatingChatRef.current) return;
      creatingChatRef.current = true;

      createChat({
        bot_id: botIdNumber,
        tg_chat_id: tgChatId,
        tg_user_id: tgChatId,
      }).then((result) => {
        creatingChatRef.current = false;
        if (createDirectChatThunk.fulfilled.match(result)) {
          initialParamsProcessedRef.current = true;
          const created = result.payload;
          setActiveChat(makeChatKey(created.bot_id, created.tg_chat_id));
        }
      });
    }
  }, [isReady, chatOrder, chatsById, chatsLoading, botIdNumber, tgChatId]);

  const handleChatOpen = (chatKey: string) => {
    const chat = chatsById[chatKey];
    if (chat) {
      setActiveChat(chatKey);
      router.push(`/${locale}/inbox/chat?chat_id=${chat.tg_chat_id}&bot_id=${chat.bot_id}`);
    }
  };

  const handleMobileClose = () => {
    setActiveChat(null);
    router.push(`/${locale}/inbox/chat`);
  };

  const handleDesktopClose = () => {
    setActiveChat(null);
    onClose();
  };

  const handleReplySent = () => {
    const chatIdParam = searchParams?.get('chat_id');
    const botIdParam = searchParams?.get('bot_id');
    if (chatIdParam && botIdParam) {
      router.push(`/${locale}/inbox/chat?chat_id=${chatIdParam}&bot_id=${botIdParam}`);
      return;
    }
    router.push(`/${locale}/inbox/chat`);
  };

  return (
    <>
      <DesktopWrapper className={styles.inboxDirectDesktop}>
        <DirectChat onClose={handleDesktopClose} replyMessageId={messageIdNumber} onReplySent={handleReplySent}/>
        <DirectMenu onChatOpen={handleChatOpen} isReady={isReady} />
      </DesktopWrapper>
      <MobileWrapper className={styles.inboxDirectMobile}>
        {activeChatId === null && <DirectMenu onChatOpen={handleChatOpen} isReady={isReady} />}
        {activeChatId !== null && <DirectChat onClose={handleMobileClose} replyMessageId={messageIdNumber} onReplySent={handleReplySent}/>}
      </MobileWrapper>
    </>
  )
}

export default InboxDirect;
