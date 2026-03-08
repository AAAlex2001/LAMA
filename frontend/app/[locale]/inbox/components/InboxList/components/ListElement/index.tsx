import { FC, useState } from "react";
import styles from "./styles.module.scss";
import Checkbox from "@/components/checkbox/checkbox";
import { DesktopWrapper, MobileWrapper } from "@/components/responsive-wrappers";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import { CheckListIcon } from "@/components/icons";
import BlockModal, { BlockModalData } from "@/app/[locale]/inbox/components/BlockModal";
import { useLongPress } from "./hooks/useLongPress";
import { ListHeaderType } from "../ListHeader";
import type { InboxEventResponse, EventType } from "../../../../store/thunks/inboxEvents";
import { useRouter } from "next/navigation";

const SOURCE_LABELS: Record<string, string> = {
  bot: 'Бот',
  channel: 'Канал',
  system: 'Системные',
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  bot_message: 'Сообщение',
  bot_command: 'Команда',
  bot_error: 'Ошибка',
  channel_comment: 'Комментарий',
  channel_join_request: 'Заявка',
  channel_link_join: 'Ссылка',
  channel_ban: 'Блокировка',
  system_notification: 'Уведомление',
  system_trigger: 'Триггер',
  system_autoreply: 'Автоответ',
  system_update: 'Обновление',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month} ${hours}:${minutes}`;
}

interface ListElementProps {
  item: InboxEventResponse;
  isChecked?: boolean;
  type?: ListHeaderType;
  onCheck?: () => void;
  onHold?: () => void;
  onSpecificAction?: (eventId: number, actionType: string, payload?: Record<string, unknown>) => any;
}

const ListElement: FC<ListElementProps> = ({
  item,
  isChecked,
  type,
  onCheck,
  onHold,
  onSpecificAction,
}) => {
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const router = useRouter();

  const longPressProps = useLongPress({
    duration: 800,
    onLongPress: () => onHold?.(),
    onHoldStart: () => setIsHolding(true),
    onHoldCancel: () => setIsHolding(false),
  });

  const shouldEnableLongPress = type === 'all';
  const isProcessed = item.status === 'processed';

  const handleAction = async (actionType: string, payload?: Record<string, unknown>) => {
    const response = await onSpecificAction?.(item.id, actionType, payload);
    if (actionType === 'reply') {
      router.push(`/inbox?chat_id=${response?.payload?.response?.chat_id}`);
    }
  };

  const handleBlockSave = (data: BlockModalData) => {
    handleAction('block', data as unknown as Record<string, unknown>);
    setIsBlockModalOpen(false);
  };

  const renderSource = () => (
    <div className={styles.source}>
      <span>{SOURCE_LABELS[item.entity_type] || item.entity_type}</span>
    </div>
  );

  const renderEventType = () => (
    <span className={styles.eventType}>{EVENT_TYPE_LABELS[item.event_type] || item.event_type}</span>
  );

  const renderActions = (isMobile?: boolean) => {
    const btnClass = `${styles.actionButton} ${isMobile ? styles.actionButtonMobile : ''}`;
    const btnWidth = isMobile ? '100%' : '136px';

    if (item.event_type === 'bot_command') {
      if (isProcessed) {
        return (
          <>
            <MobileWrapper className={styles.fullWidthMobile}>
              <div className={styles.alignRightCheck}>
                <CheckListIcon width={24} height={24} color="#3B82F6" />
              </div>
            </MobileWrapper>
            <DesktopWrapper>
              <CheckListIcon width={24} height={24} color="#3B82F6" />
            </DesktopWrapper>
          </>
        );
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('block')} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Заблокировать</span>
          </Button>
          <Button variant="outline" intent="primary" size="md" onClick={() => handleAction('delete')} className={btnClass}>
            <span className={buttonStyles.label}>Удалить</span>
          </Button>
          <span className={styles.checkIcon}>
            <CheckListIcon width={24} height={24} color="#858585" />
          </span>
        </div>
      );
    }

    if (item.event_type === 'bot_message') {
      if (isProcessed) {
        return <div className={styles.statusText}>Ответ отправлен</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('reply')} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Ответить</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'channel_comment') {
      if (isProcessed) {
        return <div className={styles.statusText}>Ответ отправлен</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('reply')} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Ответить</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'channel_join_request') {
      if (isProcessed) {
        return <div className={styles.statusText}>Принята</div>;
      }
      if (item.status === 'ignored') {
        return <div className={`${styles.statusText} ${styles.declined}`}>Отклонена</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('accept')} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Принять</span>
          </Button>
          <Button variant="outline" intent="primary" size="md" onClick={() => handleAction('reject')} className={btnClass}>
            <span className={buttonStyles.label}>Отклонить</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'channel_link_join') {
      if (isProcessed) {
        return null;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('accept')} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Принять</span>
          </Button>
          <Button variant="outline" intent="primary" size="md" onClick={() => handleAction('reject')} className={btnClass}>
            <span className={buttonStyles.label}>Отклонить</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'channel_ban') {
      if (isProcessed) {
        return <span className={styles.statusText}>Разблокирован</span>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('unban')} className={btnClass}>
            <span className={buttonStyles.label}>Разблокировать</span>
          </Button>
          <Button variant="outline" intent="primary" size="md" onClick={() => setIsBlockModalOpen(true)} className={btnClass}>
            <span className={buttonStyles.label}>Настройки</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'system_notification' || item.event_type === 'system_update') {
      return null;
    }

    if (item.event_type === 'system_trigger') {
      return null;
    }

    if (item.event_type === 'system_autoreply') {
      if (isProcessed) {
        return <span className={styles.statusText}>Ответ отправлен</span>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('reply_in_bot')} className={btnClass}>
            <span className={buttonStyles.label}>Ответить в боте</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'bot_error') {
      return (
        <div className={styles.actionButtons}>
          <Button variant="outline" intent="destructive" size="md" onClick={() => handleAction('settings')} className={btnClass}>
            <span className={buttonStyles.label}>Ошибка доступа</span>
          </Button>
        </div>
      );
    }

    return null;
  };

  const dateStr = formatDate(item.created_at);

  return (
    <>
      <BlockModal
        isOpen={isBlockModalOpen}
        onOpenChange={setIsBlockModalOpen}
        stopWord={(item.payload?.block_reason as string) || 'spam'}
        message={item.description || ''}
        onSave={handleBlockSave}
      />
      <DesktopWrapper>
        <div className={`${styles.element} ${item.is_new ? styles.unread : ''} ${isChecked ? styles.checked : ''}`}>
          <div className={styles.gridCell}>
            {isChecked !== undefined ? (
              <Checkbox checked={isChecked} onChange={() => onCheck?.()} />
            ) : item.is_new ? (
              <span className={styles.dot} />
            ) : null}
          </div>
          <div className={styles.gridCell}>{renderSource()}</div>
          <div className={styles.gridCell}>
            <span className={styles.dateTime}>{dateStr}</span>
          </div>
          <div className={styles.gridCell}>{renderEventType()}</div>
          <div className={styles.gridCell}>
            <span className={styles.username}>{item.tg_username || 'Имя пользователя'}</span>
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
        <div
          className={`${styles.elementMobileWrapper} ${item.is_new ? styles.unread : ''} ${isHolding ? styles.holding : ''} ${isChecked ? styles.checked : ''}`}
          {...(shouldEnableLongPress ? longPressProps : {})}
        >
          <div className={styles.holdOverlay} />
          <div>
            {isChecked !== undefined ? (
                <Checkbox checked={isChecked} onChange={() => onCheck?.()} />
              ): null
            }
          </div>
          <div className={styles.elementMobile}>
            <div className={styles.wrapperMobile}>
              <div className={styles.nameContent}>
                <div className={styles.source}>
                  { item.is_new && isChecked === undefined ? (
                    <span className={styles.dot} />
                  ) : null}
                  {renderSource()}
                </div>
                <div className={styles.dateTime}>
                  {dateStr}
                </div>
              </div>
              <div className={styles.descriptionContent}>
                <div className={styles.descriptionContentItem}>
                  <div className={styles.eventType}>
                    {renderEventType()}
                  </div>
                  <div className={styles.username}>
                    {item.tg_username}
                  </div>
                </div>
                <div className={styles.descriptionMobile}>
                  {item.description}
                </div>
              </div>
            </div>
            <div className={styles.actionsRow}>
              {renderActions(true)}
            </div>
          </div>
        </div>
      </MobileWrapper>
    </>
  );
}

export default ListElement;