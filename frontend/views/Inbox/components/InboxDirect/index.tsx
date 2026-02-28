'use client'

import styles from './style.module.scss';
import DirectChat from "./components/DirectChat";
import DirectMenu from "./components/DirectMenu";
import { DesktopWrapper, MobileWrapper } from '@/components/responsive-wrappers';
import { useState } from 'react';

const InboxDirect = ( { onClose }: { onClose: () => void } ) => {
  const [mobileChatOpen, setMobileChatOpen] = useState<number | null>(null);
  return (
    <>
      <DesktopWrapper>
        <div className={styles.inboxDirect}>
          <DirectChat onClose={onClose}/>
          <DirectMenu onChatOpen={setMobileChatOpen} />
        </div>
      </DesktopWrapper>
      <MobileWrapper>
        {mobileChatOpen === null && <DirectMenu onChatOpen={setMobileChatOpen} />}
        {mobileChatOpen && <DirectChat onClose={() => setMobileChatOpen(null)} />}
      </MobileWrapper>
    </>
  )
}

export default InboxDirect;