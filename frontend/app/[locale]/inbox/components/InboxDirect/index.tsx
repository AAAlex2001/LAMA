'use client'

import styles from './style.module.scss';
import DirectChat from "./components/DirectChat";
import DirectMenu from "./components/DirectMenu";
import { DesktopWrapper, MobileWrapper } from '@/components/responsive-wrappers';
import { useDirectChat } from '@/app/[locale]/inbox/store/hooks/useDirectChat';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

const InboxDirect = ( { onClose }: { onClose: () => void } ) => {
  const { activeChatId, chats, chatsLoading, setActiveChat, fetchChats } = useDirectChat();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParamsProcessedRef = useRef(false);

  const messageId = searchParams?.get('message_id');
  const messageIdNumber = messageId ? parseInt(messageId, 10) : undefined;
  const botIdParam = searchParams?.get('bot_id');
  const botIdNumber = botIdParam ? parseInt(botIdParam, 10) : undefined;

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
      const chat = chats.find((c) => {
        const matchesChatId = c.tg_chat_id === tgChatId;
        if (botIdNumber !== undefined) {
          return matchesChatId && c.bot_id === botIdNumber;
        }
        return matchesChatId;
      });
      if (chat) {
        setActiveChat(chat.id);
      }
    }
  }, [searchParams, chats, chatsLoading, setActiveChat, fetchChats, botIdNumber]);

  const handleChatOpen = (chatId: number) => {
    setActiveChat(chatId);
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      router.push(`/inbox/chat?chat_id=${chat.tg_chat_id}&bot_id=${chat.bot_id}`);
    }
  };

  const handleMobileClose = () => {
    setActiveChat(null);
    router.push("/inbox/chat");
  };

  const handleDesktopClose = () => {
    setActiveChat(null);
    onClose();
  };

  const handleReplySent = () => {
    const chatIdParam = searchParams?.get('chat_id');
    const botIdParam = searchParams?.get('bot_id');
    if (chatIdParam && botIdParam) {
      router.push(`/inbox/chat?chat_id=${chatIdParam}&bot_id=${botIdParam}`);
    } else if (chatIdParam) {
      router.push(`/inbox/chat?chat_id=${chatIdParam}`);
    } else {
      router.push("/inbox/chat");
    }
  };

  return (
    <>
      <DesktopWrapper>
        <div className={styles.inboxDirect}>
          <DirectChat onClose={handleDesktopClose} replyMessageId={messageIdNumber} onReplySent={handleReplySent}/>
          <DirectMenu onChatOpen={handleChatOpen} />
        </div>
      </DesktopWrapper>
      <MobileWrapper>
        {activeChatId === null && <DirectMenu onChatOpen={handleChatOpen} />}
        {activeChatId !== null && <DirectChat onClose={handleMobileClose} replyMessageId={messageIdNumber} onReplySent={handleReplySent}/>}
      </MobileWrapper>
    </>
  )
}

export default InboxDirect;
