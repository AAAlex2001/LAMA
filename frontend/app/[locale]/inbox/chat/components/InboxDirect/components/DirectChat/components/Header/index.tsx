import { FC } from 'react';
import classNames from 'classnames';
import { ChatChevronIcon, PinIcon, BlockedIcon } from '@/components/icons';
import Avatar from '@/components/avatar';
import styles from '../../styles.module.scss';

interface HeaderProps {
  userName: string;
  botName?: string | null;
  userPhoto?: string | null;
  hasChat?: boolean;
  isPinned: boolean;
  isBlocked: boolean;
  onClose?: () => void;
  onTogglePin: () => void;
  onToggleBlock: () => void;
}

const Header: FC<HeaderProps> = ({
  userName,
  botName,
  userPhoto,
  hasChat = true,
  isPinned,
  isBlocked,
  onClose,
  onTogglePin,
  onToggleBlock,
}) => {
  return (
    <div className={styles.header}>
      <button className={styles.backButton} type="button" onClick={onClose}>
        <ChatChevronIcon width={32} height={32} />
      </button>

      {hasChat && (
        <Avatar src={userPhoto ?? undefined} name={userName} size={40} alt={userName} />
      )}
      <div className={styles.userInfo}>
        <span className={styles.userName}>{userName}</span>
        {botName && <span className={styles.botName}>{botName}</span>}
      </div>
      <div className={styles.headerActionsWrapper}>
        <div className={styles.headerActions}>
          {hasChat && (
            <>
              <button
                className={classNames(styles.iconButtonPin, { [styles.blue]: isPinned })}
                type="button"
                onClick={onTogglePin}
              >
                <PinIcon width={16} height={16} />
              </button>
              <button
                className={classNames(styles.iconButtonBlock, { [styles.destructive]: isBlocked })}
                type="button"
                onClick={onToggleBlock}
              >
                <BlockedIcon width={16} height={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
