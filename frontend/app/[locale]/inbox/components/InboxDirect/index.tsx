'use client'

import styles from './style.module.scss';
import DirectChat from "./components/DirectChat";
import DirectMenu from "./components/DirectMenu";
import { DesktopWrapper, MobileWrapper } from '@/components/responsive-wrappers';
import { useDirectChat } from '@/app/[locale]/inbox/store/hooks/useDirectChat';

const InboxDirect = ( { onClose }: { onClose: () => void } ) => {
  const { activeChatId, setActiveChat } = useDirectChat();

  const handleChatOpen = (chatId: number) => {
    setActiveChat(chatId);
  };

  const handleMobileClose = () => {
    setActiveChat(null);
  };

  return (
    <>
      <DesktopWrapper>
        <div className={styles.inboxDirect}>
          <DirectChat onClose={onClose}/>
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