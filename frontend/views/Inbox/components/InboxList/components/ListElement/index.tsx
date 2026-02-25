import { FC } from "react";
import styles from "./styles.module.scss";
import Checkbox from "@/components/checkbox/checkbox";
import Button from "@/components/button/button";
import CheckIcon from "@/components/icons/check-icon";

export type InboxItemType = 'bot' | 'channel' | 'system';
export type EventType = 'command' | 'message' | 'comment' | 'application' | 'link' | 'block' | 'notification' | 'trigger' | 'auto-reply' | 'error';
export type EventStatus = 'pending' | 'completed' | 'accepted' | 'declined' | 'unblocked' | 'replied';

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
  hasDot?: boolean;
}

interface ListElementProps {
  item: IInboxItem;
  isChecked?: boolean;
  // @todo: make onAction 
  onCheck?: (id: number) => void;
  onBlock?: (id: number) => void;
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
  const renderSource = () => {
    const sourceText = item.type === 'bot' ? 'Бот' : item.type === 'channel' ? 'Канал' : 'Системные';
    return (
      <div className={styles.source}>
        {item.hasDot && <span className={styles.dot} />}
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
        return <CheckIcon width={16} height={16} color="#000000" />;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            text="Заблокировать" 
            variant="inlineButton" 
            showArrow={false}
            size="small"
            onClick={() => onBlock?.(item.id)}
            className={styles.actionButton}
          />
          <Button 
            text="Удалить" 
            variant="inlineButton" 
            showArrow={false}
            size="small"
            onClick={() => onDelete?.(item.id)}
            className={styles.actionButton}
          />
          <span className={styles.checkIcon}>
            <CheckIcon width={16} height={16} color="#000000" />
          </span>
        </div>
      );
    }

    if (item.eventType === 'message') {
      if (item.status === 'replied') {
        return <span className={styles.statusText}>Ответ отправлен</span>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            text="Ответить" 
            variant="inlineButton"  
            showArrow={false}
            size="small"
            onClick={() => onReply?.(item.id)}
            className={styles.actionButton}
          />
        </div>
      );
    }

    if (item.eventType === 'comment') {
      if (item.status === 'replied') {
        return <span className={styles.statusText}>Ответ отправлен</span>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button 
            text="Ответить" 
            variant="inlineButton" 
            showArrow={false}
            size="small"
            onClick={() => onReply?.(item.id)}
            className={styles.actionButton}
          />
        </div>
      );
    }

    if (item.eventType === 'application') {
      if (item.status === 'accepted') {
        return <span className={styles.statusText}>Принята</span>;
      }
      if (item.status === 'declined') {
        return <span className={styles.statusText}>Отклонена</span>;
      }
      const applicationText = item.inviteCode ? `Заявка по "${item.inviteCode}"` : item.description;
      return (
        <div className={styles.actionButtons}>
          {applicationText && <span className={styles.description}>{applicationText}</span>}
          <Button 
            text="Принять" 
            variant="inlineButton" 
            showArrow={false}
            size="small"
            onClick={() => onAccept?.(item.id)}
            className={styles.actionButton}
          />
          <Button 
            text="Отклонить" 
            variant="default" 
            showArrow={false}
            size="small"
            onClick={() => onDecline?.(item.id)}
            className={styles.actionButton}
          />
        </div>
      );
    }

    if (item.eventType === 'link') {
      return (
        <span className={styles.description}>
          {item.inviteCode ? `Присоединился по "${item.inviteCode}"` : item.description}
        </span>
      );
    }

    if (item.eventType === 'block') {
      if (item.status === 'unblocked') {
        return <span className={styles.statusText}>Разблокирован</span>;
      }
      return (
        <div className={styles.actionButtons}>
          <span className={styles.blockReason}>{item.blockReason || item.description}</span>
          <Button 
            text="Разблокировать" 
            variant="inlineButton" 
            showArrow={false}
            size="small"
            onClick={() => onUnblock?.(item.id)}
            className={styles.actionButton}
          />
          <Button 
            text="Настройки" 
            variant="default" 
            showArrow={false}
            size="small"
            onClick={() => onSettings?.(item.id)}
            className={styles.actionButton}
          />
        </div>
      );
    }

    if (item.eventType === 'notification') {
      return <span className={styles.description}>{item.description}</span>;
    }

    if (item.eventType === 'trigger') {
      return <span className={styles.description}>{item.description}</span>;
    }

    if (item.eventType === 'auto-reply') {
      if (item.status === 'replied') {
        return <span className={styles.statusText}>Ответ отправлен</span>;
      }
      return (
        <div className={styles.actionButtons}>
          <span className={styles.description}>{item.description}</span>
          <Button 
            text="Ответить в боте" 
            variant="inlineButton" 
            showArrow={false}
            size="small"
            onClick={() => onReplyInBot?.(item.id)}
            className={styles.actionButton}
          />
        </div>
      );
    }

    if (item.eventType === 'error') {
      return (
        <div className={styles.actionButtons}>
          <span className={styles.description}>{item.description}</span>
          <Button 
            text="Ошибка доступа" 
            variant="outlined-red" 
            showArrow={false}
            size="small"
            onClick={() => onSettings?.(item.id)}
            className={styles.actionButton}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.element}>
      {isChecked !== undefined ? (
        <Checkbox checked={isChecked} onChange={() => onCheck?.(item.id)} />
      ) : (
        <div className={styles.gridCell} />
      )}
      <div className={styles.gridCell}>{renderSource()}</div>
      <div className={styles.gridCell}>
        <span className={styles.date}>{item.date}</span>
      </div>
      <div className={styles.gridCell}>{renderEventType()}</div>
      <div className={styles.gridCell}>
        <span className={styles.username}>{item.username || 'Имя пользователя'}</span>
      </div>
      <div className={styles.gridCell}>
        {item.eventType === 'command' && item.description && (
          <span className={styles.commandPath}>{item.description}</span>
        )}
      </div>
      <div className={styles.gridCell}>
        {renderActions()}
      </div>
    </div>
  );
}

export default ListElement;