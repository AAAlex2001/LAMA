'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatSortingBar from "../components/ChatSortingBar";
import InboxDirect from "../components/InboxDirect";
import styles from "../styles.module.scss";
import {
  fetchBotsThunk,
  useAppDispatch,
  fetchChannelsThunk,
} from "../store";

const ChatView = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    dispatch(fetchChannelsThunk({}));
    dispatch(fetchBotsThunk({}));
  }, [dispatch]);

  const handleNavigateToInbox = () => {
    router.push('/inbox');
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
