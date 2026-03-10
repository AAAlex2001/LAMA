'use client';

import styles from "./styles.module.scss";
import ChatItem from "./components/ChatItem";
import ModalBotAutomatization from "./components/ModalBotAutomatization";
import { FC, useEffect, useRef } from "react";
import { useDirectChat } from '@/app/[locale]/inbox/store/hooks/useDirectChat';
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
  onChatOpen: (chatId: number) => void;
}

const DirectMenu: FC<DirectMenuProps> = ({ onChatOpen }) => {
  const {
    activeChatId,
    pinnedChats,
    unpinnedChats,
    chatsLoading,
    chatsHasMore,
    fetchChats,
    fetchMoreChats,
    setActiveChat,
  } = useDirectChat();

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && chatsHasMore && !chatsLoading) {
          fetchMoreChats();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [chatsHasMore, chatsLoading, fetchMoreChats]);

  const handleClick = (chatId: number) => {
    setActiveChat(chatId);
    onChatOpen(chatId);
  };

  const activeChat = activeChatId !== null
    ? [...pinnedChats, ...unpinnedChats].find((c) => c.id === activeChatId)
    : null;

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
                    username={activeChat.tg_username || undefined}
                    messagePreview={activeChat.last_message_preview || undefined}
                    time={formatChatTime(activeChat.last_message_at || activeChat.updated_at)}
                    isCurrent={true}
                    isBlocked={activeChat.is_blocked}
                    onClick={() => handleClick(activeChat.id)}
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
                      username={chat.tg_username || undefined}
                      messagePreview={chat.last_message_preview || undefined}
                      time={formatChatTime(chat.last_message_at || chat.updated_at)}
                      isPinned={true}
                      isBlocked={chat.is_blocked}
                      unreadCount={chat.unread_count}
                      onClick={() => handleClick(chat.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Все чаты</h3>
              <div className={styles.chatList}>
                {chatsLoading && pinnedChats.length === 0 && unpinnedChats.length === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                    <Loader size={20} color="blue" />
                  </div>
                )}
                {[...pinnedChats, ...unpinnedChats].map((chat) => (
                  <ChatItem
                    key={chat.id}
                    id={chat.id}
                    name={getChatDisplayName(chat)}
                    username={chat.tg_username || undefined}
                    messagePreview={chat.last_message_preview || undefined}
                    time={formatChatTime(chat.last_message_at || chat.updated_at)}
                    isPinned={false}
                    isBlocked={chat.is_blocked}
                    unreadCount={chat.unread_count}
                    onClick={() => handleClick(chat.id)}
                  />
                ))}
                {chatsHasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
                {chatsLoading && (pinnedChats.length > 0 || unpinnedChats.length > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
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
