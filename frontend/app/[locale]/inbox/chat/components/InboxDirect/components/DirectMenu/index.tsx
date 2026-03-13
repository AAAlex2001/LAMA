'use client';

import styles from "./styles.module.scss";
import ChatItem from "./components/ChatItem";
import ModalBotAutomatization from "./components/ModalBotAutomatization";
import { FC, useEffect } from "react";
import { useInView } from "@/app/[locale]/calendar/store/useInView";
import { useDirectChat } from '@/app/[locale]/inbox/store/hooks/useDirectChat';
import { makeChatKey } from '@/app/[locale]/inbox/store/slices/directChat';
import type { DirectChatResponse } from '@/app/[locale]/inbox/store/thunks/directChat';
import Loader from '@/components/loader/loader';

function getChatDisplayName(chat: DirectChatResponse): string {
  return chat.bot_username || `Chat ${chat.tg_chat_id}`;
}

function formatChatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

interface DirectMenuProps {
  onChatOpen: (chatKey: string) => void;
}

const DirectMenu: FC<DirectMenuProps> = ({ onChatOpen }) => {
  const {
    activeChatId,
    chatsById,
    pinnedChats,
    unpinnedChats,
    chatsLoading,
    chatsHasMore,
    chatSort,
    chatUnreadFilter,
    fetchChats,
    fetchMoreChats,
    setActiveChat,
  } = useDirectChat();

  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    fetchChats();
  }, [chatSort, chatUnreadFilter]);

  useEffect(() => {
    if (inView && chatsHasMore && !chatsLoading) {
      fetchMoreChats();
    }
  }, [inView, chatsHasMore, chatsLoading]);

  const handleClick = (chat: DirectChatResponse) => {
    const chatKey = makeChatKey(chat.bot_id, chat.tg_chat_id);
    setActiveChat(chatKey);
    onChatOpen(chatKey);
  };

  const activeChat = activeChatId ? chatsById[activeChatId] : null;

  const filtredUnpinned = unpinnedChats.filter((chat) => chat.bot_id !== activeChat?.bot_id && chat.tg_chat_id !== activeChat?.tg_chat_id);

  const hasNoChats = !chatsLoading && !activeChat && pinnedChats.length === 0 && unpinnedChats.length === 0;

  return (
    <div className={styles.directMenu}>
      <div className={styles.directMenuHeader}>
        <div className={styles.directMenuHeaderLeft}>
          <ModalBotAutomatization />
        </div>
      </div>
      <div className={styles.directMenuContent}>
        {hasNoChats ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateContent}>
              <h3 className={styles.emptyStateTitle}>Чатов пока нет</h3>
              <p className={styles.emptyStateSubtitle}>
                Здесь будут отображаться ваши чаты
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeChat && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Текущий чат</h3>
                <div className={styles.chatList}>
                  <ChatItem
                    id={activeChat.id}
                    name={getChatDisplayName(activeChat)}
                    username={activeChat.tg_username || activeChat.tg_first_name || undefined}
                    messagePreview={activeChat.last_message_preview || undefined}
                    time={formatChatTime(activeChat.last_message_at || activeChat.updated_at)}
                    isCurrent={true}
                    isBlocked={activeChat.is_blocked}
                    onClick={() => handleClick(activeChat)}
                  />
                </div>
              </div>
            )}
            {pinnedChats.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Закрепленные чаты</h3>
                <div className={styles.chatList}>
                  {pinnedChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      id={chat.id}
                      name={getChatDisplayName(chat)}
                      username={chat.tg_username || chat.tg_first_name || undefined}
                      messagePreview={chat.last_message_preview || undefined}
                      time={formatChatTime(chat.last_message_at || chat.updated_at)}
                      isPinned={true}
                      isBlocked={chat.is_blocked}
                      unreadCount={chat.unread_count}
                      onClick={() => handleClick(chat)}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Все чаты</h3>
              <div className={styles.chatList}>
                {chatsLoading && pinnedChats.length === 0 && unpinnedChats.length === 0 && (
                  <div className={styles.loaderContainer}>
                    <Loader size={20} color="blue" />
                  </div>
                )}
                {filtredUnpinned.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    id={chat.id}
                    name={getChatDisplayName(chat)}
                    username={chat.tg_username || chat.tg_first_name || undefined}
                    messagePreview={chat.last_message_preview || undefined}
                    time={formatChatTime(chat.last_message_at || chat.updated_at)}
                    isPinned={false}
                    isBlocked={chat.is_blocked}
                    unreadCount={chat.unread_count}
                    onClick={() => handleClick(chat)}
                  />
                ))}
                {chatsHasMore && <div ref={sentinelRef as React.Ref<HTMLDivElement>} style={{ height: 1 }} />}
                {chatsLoading && (pinnedChats.length > 0 || unpinnedChats.length > 0) && (
                  <div 
                    className={styles.loaderContainer}
                  >
                    <Loader size={20} color="blue" />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DirectMenu;
