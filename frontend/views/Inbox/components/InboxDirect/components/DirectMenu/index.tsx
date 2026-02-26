import styles from "./styles.module.scss";
import ChatItem, { ChatProps } from "./components/ChatItem";
import Button from "@/components/button/button";
import ModalBotAutomatization from "./components/ModalBotAutomatization";

const DirectMenu = () => {
  const currentChat: ChatProps = {
    id: 1,
    name: "Назв бота",
    username: "Username",
    messagePreview: "Превь...",
    time: "8:38",
    isCurrent: true,
  };

  const pinnedChats: ChatProps[] = [
    {
      id: 2,
      name: "Назв бота",
      username: "Username",
      messagePreview: "Превью...",
      time: "8:38",
      isPinned: true,
      unreadCount: 3,
    },
    {
      id: 3,
      name: "Назв бота",
      username: "Username",
      messagePreview: "Превью...",
      time: "8:38",
      isPinned: true,
      unreadCount: 3,
    },
  ];

  const allChats: ChatProps[] = [
    {
      id: 4,
      name: "Назв бота",
      username: "Username",
      messagePreview: "Превь...",
      time: "8:38",
    },
    {
      id: 5,
      name: "Назв бота",
      username: "Username",
      time: "8:38",
      isBlocked: true,
    },
  ];

  return (
    <div className={styles.directMenu}>
      <div className={styles.directMenuHeader}>
        <div className={styles.directMenuHeaderLeft}>
          <ModalBotAutomatization />
        </div>
      </div>
      <div className={styles.directMenuContent}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Текущий чат</h3>
          <div className={styles.chatList}>
            <ChatItem {...currentChat} />
          </div>
        </div>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Закрепленные чаты</h3>
          <div className={styles.chatList}>
            {pinnedChats.map((chat) => (
              <ChatItem key={chat.id} {...chat} />
            ))}
          </div>
        </div>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Все чаты</h3>
          <div className={styles.chatList}>
            {allChats.map((chat) => (
              <ChatItem key={chat.id} {...chat} />
            ))}
          </div>
        </div>
      </div>
    </div>  
  )
}

export default DirectMenu;