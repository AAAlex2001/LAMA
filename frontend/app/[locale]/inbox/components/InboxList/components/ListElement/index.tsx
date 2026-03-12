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
import type { InboxEventResponse, EventType, InboxActionType, SpecificActionResponse } from "../../../../store/thunks/inboxEvents";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/notifications/NotificationProvider";

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
  onSpecificAction?: (eventId: number, actionType: InboxActionType, payload?: Record<string, unknown>) => any;
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
  const [blockStatus, setBlockStatus] = useState<{
    status: string;
    bot_id: number | null;
    tg_user_id: number | null;
    chat_id: number | null;
    message_id: number | null;
    affected_channels: number[] | null;
  } | null>(null);
  const router = useRouter();
  const { showError } = useNotifications();

  const longPressProps = useLongPress({
    duration: 800,
    onLongPress: () => onHold?.(),
    onHoldStart: () => setIsHolding(true),
    onHoldCancel: () => setIsHolding(false),
  });

  const shouldEnableLongPress = type === 'all';
  const isProcessed = item.status === 'processed';

  const saveActionResult = (response: SpecificActionResponse) => {
    setBlockStatus({
      status: response.status || "resolved",
      bot_id: response.bot_id ?? null,
      tg_user_id: response.tg_user_id ?? null,
      chat_id: response.chat_id ?? null,
      message_id: response.message_id ?? null,
      affected_channels: response.affected_channels ?? null,
    });
  };

  const handleAction = async (actionType: InboxActionType, payload?: Record<string, unknown>) => {
    try {
      const result = await onSpecificAction?.(item.id, actionType, payload);
      const response = result?.payload?.response as SpecificActionResponse | undefined;
      if (!response) return;

      saveActionResult(response);

      if (actionType === 'reply') {
        const chatId = response.chat_id;
        const messageId = item.payload?.message_id;
        const botId = response.bot_id;
        const url = messageId
          ? `/inbox/chat?chat_id=${chatId}&message_id=${messageId}&bot_id=${botId}`
          : `/inbox/chat?chat_id=${chatId}&bot_id=${botId}`;
        router.push(url);
      }
    } catch {
      showError('Не удалось выполнить действие');
    }
  };

  const handleBlockSave = (data: BlockModalData) => {
    setIsBlockModalOpen(false);
  };

  const handleBlockModalResult = (response: SpecificActionResponse) => {
    saveActionResult(response);
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
    const status = blockStatus?.status;

    if (item.event_type === 'bot_command') {
      if (status === 'resolved' || status === 'deleted' || status === 'blocked') return (
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
      if (item.payload?.handled) {
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
          <Button variant="outline" intent="primary" size="md" onClick={() => handleAction('delete_message')} className={btnClass}>
            <span className={buttonStyles.label}>Удалить</span>
          </Button>
          <Button variant="ghost" intent="primary" size="transparent" onClick={()=> handleAction('mark_resolved')}>
            <CheckListIcon width={24} height={24} />
          </Button>
        </div>
      );
    }

    if (item.event_type === 'bot_message') {
      if (status === 'replied' || isProcessed) {
        return <div className={styles.statusText}>Ответ отправлен</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('reply')} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Ответить в боте</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'channel_comment') {
      if (status === 'replied' || isProcessed) {
        return <div className={styles.statusText}>Ответ отправлен</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('reply')} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Ответить в боте</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'channel_join_request') {
      if (status === 'accepted' || item.payload?.join_state === 'accepted') {
        return <div className={styles.statusText}>Принята</div>;
      }
      if (status === 'rejected' || item.payload?.join_state === 'rejected') {
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
      if (status === 'accepted') return <div className={styles.statusText}>Принята</div>;
      if (status === 'rejected') return <div className={`${styles.statusText} ${styles.declined}`}>Отклонена</div>;
      if (isProcessed) return null;
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
      if (status === 'unbanned') return <div className={styles.statusText}>Разблокирован</div>;
      if (status === 'ban_updated') return <div className={styles.statusText}>Блокировка обновлена</div>;
      if (status === 'blocked') return <div className={styles.statusText}>Заблокирован</div>;
      if (isProcessed) return <span className={styles.statusText}>Разблокирован</span>;
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
      return null;
    }

    if (item.event_type === 'bot_error') {
      return (
        <div className={styles.actionButtons}>
          <Button variant="outline" intent="destructive" size="md" onClick={() => handleAction('mark_resolved')} className={btnClass}>
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
        eventId={item.id}
        onSave={handleBlockSave}
        onActionResult={handleBlockModalResult}
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