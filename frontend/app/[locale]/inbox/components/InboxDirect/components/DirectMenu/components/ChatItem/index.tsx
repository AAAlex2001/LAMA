import { BlockedIcon } from "@/components/icons";
import Checkbox from "@/components/checkbox/checkbox";
import styles from "./styles.module.scss";
import classNames from "classnames";

export interface ChatProps {
  id: number;
  name: string;
  username: string;
  avatar?: string;
  messagePreview?: string;
  time: string;
  isCurrent?: boolean;
  isPinned?: boolean;
  isBlocked?: boolean;
  unreadCount?: number;
  onClick?: () => void;
  showCheckbox?: boolean;
  checked?: boolean;
  onCheckChange?: (checked: boolean) => void;
}

const ChatItem = (chat: ChatProps) => {
  const {
    name,
    username,
    messagePreview,
    time,
    isCurrent = false,
    isPinned = false,
    isBlocked = false,
    unreadCount = 0,
    onClick,
    showCheckbox = false,
    checked = false,
    onCheckChange,
  } = chat;

  const hasUnread = unreadCount > 0;

  const handleCheckboxChange = (newChecked: boolean) => {
    onCheckChange?.(newChecked);
  };

  const handleItemClick = () => {
    if (!showCheckbox) {
      onClick?.();
    }
  };

  const Component = showCheckbox ? 'div' : 'button';

  return (
    <Component
      className={classNames(styles.chatItem, {
        [styles.chatItemCurrent]: isCurrent,
        [styles.chatItemPinned]: isPinned && !isCurrent,
        [styles.chatItemBlocked]: isBlocked,
        [styles.chatItemWithCheckbox]: showCheckbox,
      })}
      onClick={handleItemClick}
      disabled={isBlocked && !showCheckbox}
    >
      {showCheckbox && (
        <div className={styles.checkboxWrapper} onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={checked}
            onChange={handleCheckboxChange}
          />
        </div>
      )}
      <div className={styles.chatItemContent}>
        <div className={styles.chatItemHeader}>
          <div className={classNames(styles.itemHeader, {
            [styles.paddingLeft]: !hasUnread && !isBlocked && !showCheckbox,
          })}>
            {hasUnread && !isCurrent && (
              <div className={styles.unreadBadge}>
                <span>{unreadCount}</span>
              </div>
            )}
            {isBlocked && (
              <div className={styles.blockedIcon}>
                <BlockedIcon width={16} height={16} />
              </div>
            )}
            <span className={styles.chatItemName}>{name}</span>
          </div>
          <span className={styles.chatItemUsername}>{username}</span>
          {messagePreview && !isBlocked && (
            <span className={styles.chatItemMessagePreview}>{messagePreview}</span>
          )}
          <span className={styles.chatItemTime}>{time}</span>
        </div>
      </div>
    </Component>
  );
};

export default ChatItem;