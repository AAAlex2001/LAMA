'use client'

import styles from './style.module.scss';
import DirectChat from "./components/DirectChat";
import DirectMenu from "./components/DirectMenu";
import { DesktopWrapper, MobileWrapper } from '@/components/responsive-wrappers';
import { useDirectChat } from '@/app/[locale]/inbox/store/hooks/useDirectChat';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

const InboxDirect = ( { onClose }: { onClose: () => void } ) => {
  const { activeChatId, chats, chatsLoading, setActiveChat, fetchChats, setReplyToMessageId } = useDirectChat();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParamsProcessedRef = useRef(false);

  useEffect(() => {
    if (initialParamsProcessedRef.current) return;
    const chatIdParam = searchParams?.get('chat_id');
    if (!chatIdParam) return;

    const tgChatId = parseInt(chatIdParam, 10);
    if (isNaN(tgChatId) || tgChatId <= 0) return;

    if (chats.length === 0 && !chatsLoading) {
      fetchChats({});
      return;
    }

    if (chats.length > 0 && !chatsLoading) {
      initialParamsProcessedRef.current = true;
      const chat = chats.find((c) => c.tg_chat_id === tgChatId);
      if (chat) {
        setActiveChat(chat.id);
        const messageIdParam = searchParams?.get('message_id');
        if (messageIdParam) {
          const msgId = parseInt(messageIdParam, 10);
          if (!isNaN(msgId) && msgId > 0) {
            setReplyToMessageId(msgId);
          }
        }
      }
    }
  }, [searchParams, chats, chatsLoading, setActiveChat, fetchChats]);

  const handleChatOpen = (chatId: number) => {
    setActiveChat(chatId);
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      router.push("/inbox/chat?chat_id=" + chat.tg_chat_id);
    }
  };

  const handleMobileClose = () => {
    setActiveChat(null);
    router.push("/inbox/chat");
  };

  const handleDesktopClose = () => {
    setActiveChat(null);
    router.push("/inbox/chat");
    onClose();
  };

  return (
    <>
      <DesktopWrapper>
        <div className={styles.inboxDirect}>
          <DirectChat onClose={handleDesktopClose}/>
          <DirectMenu onChatOpen={handleChatOpen} />
        </div>
      </DesktopWrapper>
      <MobileWrapper>
        {activeChatId === null && <DirectMenu onChatOpen={handleChatOpen} />}
        {activeChatId !== null && <DirectChat onClose={handleMobileClose} />}
      </MobileWrapper>
    </>
  )
}

export default InboxDirect;
