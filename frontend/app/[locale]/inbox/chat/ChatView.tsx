'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import ChatSortingBar from "./components/ChatSortingBar";
import InboxDirect from "./components/InboxDirect";
import styles from "../styles.module.scss";
import {
  useAppDispatch,
  useAppSelector,
  setChatSort,
  setChatUnreadFilter,
  selectChatSort,
  selectChatUnreadFilter,
} from "../store";

const ChatView = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { locale } = useParams();
  const searchParams = useSearchParams();

  const chatSort = useAppSelector(selectChatSort);
  const chatUnreadFilter = useAppSelector(selectChatUnreadFilter);

  const hasInitialSortParams = !!(searchParams?.get('sort') || searchParams?.get('unread'));
  const [initialized, setInitialized] = useState(!hasInitialSortParams);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (initialized) return;

    const sort = searchParams?.get('sort') as 'new' | 'old' | null;
    const unread = searchParams?.get('unread') as 'unread' | 'read' | null;

    if (sort && ['new', 'old'].includes(sort)) {
      dispatch(setChatSort(sort));
    }
    if (unread && ['unread', 'read'].includes(unread)) {
      dispatch(setChatUnreadFilter(unread));
    }

    setInitialized(true);
  }, [searchParams, dispatch, initialized]);

  useEffect(() => {
    if (!initialized || isNavigatingRef.current) return;

    const params = new URLSearchParams(searchParams?.toString() || '');

    const chatId = params.get('chat_id');
    const botId = params.get('bot_id');
    const messageId = params.get('message_id');

    const newParams = new URLSearchParams();
    if (chatId) newParams.set('chat_id', chatId);
    if (botId) newParams.set('bot_id', botId);
    if (messageId) newParams.set('message_id', messageId);

    if (chatSort && chatSort !== 'new') {
      newParams.set('sort', chatSort);
    }
    if (chatUnreadFilter) {
      newParams.set('unread', chatUnreadFilter);
    }

    const newParamsString = newParams.toString();
    const currentParamsString = params.toString();

    if (newParamsString !== currentParamsString) {
      const newUrl = newParamsString
        ? `/${locale}/inbox/chat?${newParamsString}`
        : `/${locale}/inbox/chat`;
      router.replace(newUrl, { scroll: false });
    }
  }, [initialized, chatSort, chatUnreadFilter, locale, router, searchParams]);

  const handleNavigateToInbox = () => {
    isNavigatingRef.current = true;
    router.push(`/${locale}/inbox`);
  };

  return (
    <div className={`${styles.chatContainer} ${styles.direct}`}>
      <ChatSortingBar
        onNavigateToOtherView={handleNavigateToInbox}
      />
      <InboxDirect onClose={handleNavigateToInbox} isReady={initialized} />
    </div>
  );
};

export default ChatView;
