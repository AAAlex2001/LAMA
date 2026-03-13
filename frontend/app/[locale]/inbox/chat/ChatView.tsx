'use client';

import { useRouter, useParams } from "next/navigation";
import ChatSortingBar from "./components/ChatSortingBar";
import InboxDirect from "./components/InboxDirect";
import styles from "../styles.module.scss";

const ChatView = () => {
  const router = useRouter();
  const { locale } = useParams();

  const handleNavigateToInbox = () => {
    router.push(`/${locale}/inbox`);
  };

  return (
    <div className={`${styles.container} ${styles.direct}`}>
      <ChatSortingBar
        onNavigateToOtherView={handleNavigateToInbox}
      />
      <InboxDirect onClose={handleNavigateToInbox} />
    </div>
  );
};

export default ChatView;
