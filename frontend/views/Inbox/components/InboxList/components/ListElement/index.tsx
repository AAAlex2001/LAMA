import { FC, useState } from "react";
import styles from "./styles.module.scss";
import Checkbox from "@/components/checkbox/checkbox";
import { DesktopWrapper, MobileWrapper } from "@/components/responsive-wrappers";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import { CheckListIcon } from "@/components/icons";
import BlockModal, { BlockModalData } from "@/views/Inbox/components/BlockModal";
export type InboxItemType = 'bot' | 'channel' | 'system';
export type EventType = 'command' | 'message' | 'comment' | 'application' | 'link' | 'block' | 'notification' | 'trigger' | 'auto-reply' | 'error';
export type EventStatus = 'pending' | 'completed' | 'accepted' | 'declined' | 'unblocked' | 'replied' | 'conected';

export interface IInboxItem {
  id: number;
  type: InboxItemType;
  eventType: EventType;
  date: string;
  title: string;
  username?: string;
  description?: string;
  status?: EventStatus;
  blockReason?: string; 
  inviteCode?: string; 
  isChecked?: boolean;
  hasUnread?: boolean;
}

interface ListElementProps {
  item: IInboxItem;
  isChecked?: boolean;
  // @todo: make onAction 
  onCheck?: (id: number) => void;
  onBlock?: (id: number, blockData?: BlockModalData) => void;
  onDelete?: (id: number) => void;
  onReply?: (id: number) => void;
  onAccept?: (id: number) => void;
  onDecline?: (id: number) => void;
  onUnblock?: (id: number) => void;
  onSettings?: (id: number) => void;
  onReplyInBot?: (id: number) => void;
}

const ListElement: FC<ListElementProps> = ({ 
  item, 
  isChecked, 
  onCheck,
  onBlock,
  onDelete,
  onReply,
  onAccept,
  onDecline,
  onUnblock,
  onSettings,
  onReplyInBot,
}) => {
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const handleBlockClick = () => {
    setIsBlockModalOpen(true);
  };

  const handleBlockSave = (data: BlockModalData) => {
    onBlock?.(item.id, data);
    setIsBlockModalOpen(false);
  };
  const renderSource = () => {
    const sourceText = item.type === 'bot' ? 'Бот' : item.type === 'channel' ? 'Канал' : 'Системные';
    return (
      <div className={styles.source}>
        <span>{sourceText}</span>
      </div>
    );
  };

  const renderEventType = () => {
    const eventTypeMap: Record<EventType, string> = {
      'command': 'Команда',
      'message': 'Сообщение',
      'comment': 'Комментарий',
      'application': 'Заявка',
      'link': 'Ссылка',
      'block': 'Блокировка',
      'notification': 'Уведомление',
      'trigger': 'Триггер',
      'auto-reply': 'Автоответ',
      'error': 'Ошибка',
    };
    return <span className={styles.eventType}>{eventTypeMap[item.eventType]}</span>;
  };

  const renderActions = () => {
    if (item.eventType === 'command') {
      if (item.status === 'completed') {
        return <CheckListIcon width={24} height={24} color="#3B82F6" />;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="fill" 
            intent="primary"
            size="md"
            onClick={() => onBlock?.(item.id)}
            className={styles.actionButton}
            style={{ width: '136px' }}
          >
            <span className={buttonStyles.label}>Заблокировать</span>
          </Button >
          <Button 
            variant="outline" 
            intent="primary"
            size="md"
            onClick={() => onDelete?.(item.id)}
            className={styles.actionButton}
          >
            <span className={buttonStyles.label}>Удалить</span>
          </Button>
          <span className={styles.checkIcon}>
            <CheckListIcon width={24} height={24} color="#858585" />
          </span>
        </div>
      );
    }

    if (item.eventType === 'message') {
      if (item.status === 'replied') {
        return <div className={styles.statusText}>Ответ отправлен</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="fill" 
            intent="primary"
            size="md"
            onClick={() => onBlock?.(item.id)}
            className={styles.actionButton}
            style={{ width: '136px' }}
          >
            <span className={buttonStyles.label}>Заблокировать</span>
          </Button >
        </div>
      );
    }

    if (item.eventType === 'comment') {
      if (item.status === 'replied') {
        return <div className={styles.statusText}>Ответ отправлен</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="fill" 
            intent="primary"
            size="md"
            onClick={() => onReply?.(item.id)}
            className={styles.actionButton}
            style={{ width: '136px' }}
          >
            <span className={buttonStyles.label}>Ответить</span>
          </Button>
        </div>
      );
    }

    if (item.eventType === 'application') {
      if (item.status === 'accepted') {
        return <div className={styles.statusText}>Принята</div>;
      }
      if (item.status === 'declined') {
        return <div className={`${styles.statusText} ${styles.declined}`}>Отклонена</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="fill" 
            intent="primary"
            size="md"
            onClick={() => onAccept?.(item.id)}
            className={styles.actionButton}
            style={{ width: '136px' }}
          >
            <span className={buttonStyles.label}>Принять</span>
          </Button>
          <Button 
            variant="outline" 
            intent="primary"
            size="md"
            onClick={() => onDecline?.(item.id)}
            className={styles.actionButton}
          >
            <span className={buttonStyles.label}>Отклонить</span>
          </Button>
        </div>
      );
    }

    if (item.eventType === 'link') {
      if (item.status === 'conected') {
        return null;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="fill" 
            intent="primary"
            size="md"
            onClick={() => onAccept?.(item.id)}
            className={styles.actionButton}
            style={{ width: '136px' }}
          >
            <span className={buttonStyles.label}>Принять</span>
          </Button>
          <Button 
            variant="outline" 
            intent="primary"
            size="md"
            onClick={() => onDecline?.(item.id)}
            className={styles.actionButton}
          >
            <span className={buttonStyles.label}>Отклонить</span>
          </Button>
        </div>
      );
    }

    if (item.eventType === 'block') {
      if (item.status === 'unblocked') {
        return <span className={styles.statusText}>Разблокирован</span>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="fill" 
            intent="primary"
            size="md"
            onClick={() => onUnblock?.(item.id)}
            className={styles.actionButton}
          >
            <span className={buttonStyles.label}>Разблокировать</span>
          </Button>
          <Button 
            variant="outline" 
            intent="primary"
            size="md"
            onClick={handleBlockClick}
            className={styles.actionButton}
          >
            <span className={buttonStyles.label}>Настройки</span>
          </Button>
        </div>
      );
    }

    if (item.eventType === 'notification') {
      return null;
    }

    if (item.eventType === 'trigger') {
      return null;
    }

    if (item.eventType === 'auto-reply') {
      if (item.status === 'replied') {
        return <span className={styles.statusText}>Ответ отправлен</span>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="fill" 
            intent="primary"
            size="md"
            onClick={() => onReplyInBot?.(item.id)}
            className={styles.actionButton}
          >
            <span className={buttonStyles.label}>Ответить в боте</span>
          </Button>
        </div>
      );
    }

    if (item.eventType === 'error') {
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="outline" 
            intent="destructive"
            size="md"
            onClick={() => onSettings?.(item.id)}
            className={styles.actionButton}
          >
            <span className={buttonStyles.label}>Ошибка доступа</span>
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <BlockModal
        isOpen={isBlockModalOpen}
        onOpenChange={setIsBlockModalOpen}
        stopWord={item.blockReason || 'spam'}
        message={item.description || 'Купи сейчас...'}
        onSave={handleBlockSave}
      />
      <DesktopWrapper>
        <div className={`${styles.element} ${item.hasUnread ? styles.unread : ''}`}>
          <div className={styles.gridCell}>
            {isChecked !== undefined ? (
              <Checkbox checked={isChecked} onChange={() => onCheck?.(item.id)} />
            ) : item.hasUnread ? (
              <span className={styles.dot} />
            ) : null}
          </div>
          <div className={styles.gridCell}>{renderSource()}</div>
          <div className={styles.gridCell}>
            <span className={styles.dateTime}>{item.date}</span>
          </div>
          <div className={styles.gridCell}>{renderEventType()}</div>
          <div className={styles.gridCell}>
            <span className={styles.username}>{item.username || 'Имя пользователя'}</span>
          </div>
          <div className={styles.gridCell}>
            <span className={styles.commandPath}>{item.description}</span>
          </div>
          <div className={styles.gridCell}>
            {renderActions()}
          </div>
        </div>
      </DesktopWrapper>
      <MobileWrapper>
        <div className={`${styles.elementMobileWrapper} ${item.hasUnread ? styles.unread : ''}`}>
          <div>
            {isChecked !== undefined ? (
                <Checkbox checked={isChecked} onChange={() => onCheck?.(item.id)} />
              ): null
            }
          </div>
          <div className={styles.elementMobile}>
            <div className={styles.wrapperMobile}>
              <div className={styles.nameContent}>
                <div className={styles.source}>
                  { item.hasUnread && isChecked === undefined ? (
                    <span className={styles.dot} />
                  ) : null}
                  {renderSource()}
                </div>
                <div className={styles.dateTime}>
                  {item.date}
                </div>
              </div>
              <div className={styles.descriptionContent}>
                <div className={styles.descriptionContentItem}>
                  <div className={styles.eventType}>
                    {renderEventType()}
                  </div>
                  <div className={styles.username}>
                    {item.username}
                  </div>
                </div>
                <div className={styles.description}>
                  {item.description}
                </div>
              </div>
            </div>
            <div className={styles.actionsRow}>
              {renderActions()}
            </div>
          </div>
        </div>
      </MobileWrapper>
    </>

  );
}

export default ListElement;