import { FC, memo, useState, MouseEvent, KeyboardEvent, useRef, useCallback } from "react";
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
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import type { CheckedItemsAction } from "../../hooks/useCheckedItems";
import { useAppDispatch, specificInboxActionThunk } from "../../../../store";

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

function getBlockModalContext(item: InboxEventResponse): {
  reason?: string;
  reasonSource: string;
} {
  const reason =
    (typeof item.reason === 'string' && item.reason.trim() ? item.reason : null) ??
    (typeof item.payload?.reason === 'string' && item.payload.reason.trim() ? item.payload.reason : null) ??
    undefined;
  const reasonSource =
    (typeof item.reason_source === 'string' && item.reason_source ? item.reason_source : null) ??
    (typeof item.payload?.reason_source === 'string' && item.payload.reason_source ? item.payload.reason_source : null) ??
    'spam';
  return {
    reason,
    reasonSource,
  };
}

interface ListElementProps {
  item: InboxEventResponse;
  isChecked?: boolean;
  type?: ListHeaderType;
  selectionDispatch?: React.Dispatch<CheckedItemsAction>;
  blockDispatch?: React.Dispatch<{ type: "open"; eventId: number; username?: string; payload?: Record<string, unknown> }>;
}

const ListElement: FC<ListElementProps> = ({
  item,
  isChecked,
  type,
  selectionDispatch,
  blockDispatch,
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
  const [loadingAction, setLoadingAction] = useState<InboxActionType | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { locale } = useParams();
  const { showError } = useNotifications();

  const itemId = item.id.toString();

  const handleCheck = (_checked?: boolean) => {
    selectionDispatch?.({ type: "toggle", id: itemId });
  };

  const handleHold = () => {
    selectionDispatch?.({ type: "holdSelect", id: itemId });
  };

  const isSelectionMode = isChecked !== undefined;
  const toggledByPointerRef = useRef(false);

  const isInteractiveTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return Boolean(
      el.closest(
        'button, a, input, textarea, select, label, [role="button"], [role="link"], [data-prevent-row-toggle]'
      )
    );
  };

  const handleRowClick = (e: MouseEvent) => {
    if (!isSelectionMode) return;
    if (toggledByPointerRef.current) {
      toggledByPointerRef.current = false;
      return;
    }
    if (isInteractiveTarget(e.target)) return;
    handleCheck();
  };

  const handleRowPointerUp = (e: React.PointerEvent) => {
    if (!isSelectionMode) return;
    if (isInteractiveTarget(e.target)) return;
    toggledByPointerRef.current = true;
    handleCheck();
  };

  const handleRowKeyDown = (e: KeyboardEvent) => {
    if (!isSelectionMode) return;
    if (isInteractiveTarget(e.target)) return;
    // if (e.key === 'Enter' || e.key === ' ') {
      // e.preventDefault();
      handleCheck();
    // }
  };

  const longPressProps = useLongPress({
    duration: 800,
    onLongPress: handleHold,
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

  const handleAction = useCallback(async (actionType: InboxActionType, payload?: Record<string, unknown>) => {
    if (actionType === 'block') {
      blockDispatch?.({ type: "open", eventId: item.id, username: item.tg_username || undefined, payload });
      return;
    }

    setLoadingAction(actionType);
    try {
      const result = await dispatch(specificInboxActionThunk({ eventId: item.id, action_type: actionType, payload }));

      if (specificInboxActionThunk.rejected.match(result)) {
        showError((result.payload as string) || 'Не удалось выполнить действие');
        return;
      }

      const response = (result as any)?.payload?.response as SpecificActionResponse | undefined;
      if (!response) return;

      saveActionResult(response);

      if (actionType === 'reply') {
        const chatId = response.chat_id;
        const botId = response.bot_id;
        const messageId = item.event_type === 'system_trigger' ? undefined : item.payload?.message_id;
        const url = messageId
          ? `/${locale}/inbox/chat?chat_id=${chatId}&message_id=${messageId}&bot_id=${botId}`
          : `/${locale}/inbox/chat?chat_id=${chatId}&bot_id=${botId}`;
        setTimeout(() => router.push(url), 500);
      }
    } catch {
      showError('Не удалось выполнить действие');
    } finally {
      setLoadingAction(null);
    }
  }, [dispatch, item, locale, router, showError, blockDispatch]);

  const handleBlockSave = (data: BlockModalData) => {
    setIsBlockModalOpen(false);
  };

  const handleBlockModalResult = (response: SpecificActionResponse) => {
    saveActionResult(response);
  };

  const getSourceDisplayText = () => {
    const hasBotContext = item.entity_type === 'bot';
    const name = item.tg_bot_name?.trim();
    const username = item.tg_bot_username?.trim();
    if (hasBotContext && (name || username)) {
      if (name) return name;
      return username!.startsWith('@') ? username! : `@${username}`;
    }
    return SOURCE_LABELS[item.entity_type] || item.entity_type;
  };

  const renderSource = () => (
    <div className={styles.sourceInner}>
      <span className={styles.sourceLabel}>{getSourceDisplayText()}</span>
    </div>
  );

  const renderEventType = () => (
    <span className={styles.eventType}>{EVENT_TYPE_LABELS[item.event_type] || item.event_type}</span>
  );

  const renderActions = (isMobile?: boolean) => {
    const btnClass = `${styles.actionButton} ${isMobile ? styles.actionButtonMobile : ''}`;
    const btnWidth = isMobile ? '100%' : '150px';
    const status = blockStatus?.status;
    const isBanned = item.status === 'banned' || status === 'banned' || status === 'blocked';
    const isBusy = loadingAction !== null;

    if (isBanned){
      return <div className={`${styles.statusText} ${styles.declined}`}>Заблокирован</div>;
    };
    
    if (item.status === 'ignored' || status === 'ignored') {
      return <div className={`${styles.statusText} ${styles.ignored}`}>Проигнорировано</div>;
    }


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
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('block')} disabled={isBusy} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Заблокировать</span>
          </Button>
          <Button variant="outline" intent="primary" size="md" onClick={() => handleAction('delete_message')} loading={loadingAction === 'delete_message'} disabled={isBusy} className={btnClass}>
            <span className={buttonStyles.label}>Удалить</span>
          </Button>
          <Button variant="ghost" intent="primary" size="transparent" onClick={() => handleAction('mark_resolved')} loading={loadingAction === 'mark_resolved'} disabled={isBusy}>
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
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('reply')} loading={loadingAction === 'reply'} disabled={isBusy} className={btnClass} style={{ width: btnWidth }}>
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
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('reply')} loading={loadingAction === 'reply'} disabled={isBusy} className={btnClass} style={{ width: btnWidth }}>
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
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('accept')} loading={loadingAction === 'accept'} disabled={isBusy} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Принять</span>
          </Button>
          <Button variant="outline" intent="primary" size="md" onClick={() => handleAction('reject')} loading={loadingAction === 'reject'} disabled={isBusy} className={btnClass}>
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
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('accept')} loading={loadingAction === 'accept'} disabled={isBusy} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Принять</span>
          </Button>
          <Button variant="outline" intent="primary" size="md" onClick={() => handleAction('reject')} loading={loadingAction === 'reject'} disabled={isBusy} className={btnClass}>
            <span className={buttonStyles.label}>Отклонить</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'channel_ban') {
      const triggerAction = typeof item.payload?.action === 'string' ? item.payload.action : null;
      if (triggerAction === 'UNBAN_USER') return <div className={styles.statusText}>Разблокирован триггером</div>;
      if (triggerAction === 'REMOVE_FROM_GROUP') return <div className={styles.statusText}>Удалён из группы</div>;
      if (status === 'unbanned') return <div className={styles.statusText}>Разблокирован</div>;
      if (status === 'ban_updated') return <div className={styles.statusText}>Блокировка обновлена</div>;
      if (status === 'blocked') return <div className={styles.statusText}>Заблокирован</div>;
      if (isProcessed) return <span className={styles.statusText}>Разблокирован</span>;
      return (
        <div className={styles.actionButtons}>
          <Button 
            variant="fill" 
            intent="primary" 
            size="md" 
            onClick={() => handleAction('unban')} 
            loading={loadingAction === 'unban'} 
            disabled={isBusy} 
            className={btnClass}
            style={{ width: btnWidth }}
          >
            <span className={buttonStyles.label}>Разблокировать</span>
          </Button>
          <Button variant="outline" intent="primary" size="md" onClick={() => setIsBlockModalOpen(true)} disabled={isBusy} className={btnClass}>
            <span className={buttonStyles.label}>Настройки</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'system_notification' || item.event_type === 'system_update') {
      return null;
    }

    if (item.event_type === 'system_trigger') {
      if (status === 'replied' || isProcessed) {
        return <div className={styles.statusText}>Ответ отправлен</div>;
      }
      return (
        <div className={styles.actionButtons}>
          <Button variant="fill" intent="primary" size="md" onClick={() => handleAction('reply')} loading={loadingAction === 'reply'} disabled={isBusy} className={btnClass} style={{ width: btnWidth }}>
            <span className={buttonStyles.label}>Ответить в боте</span>
          </Button>
        </div>
      );
    }

    if (item.event_type === 'system_autoreply') {
      return null;
    }

    if (item.event_type === 'bot_error') {
      return (
        <div className={styles.actionButtons}>
          <Button variant="outline" intent="destructive" size="md" onClick={() => handleAction('mark_resolved')} loading={loadingAction === 'mark_resolved'} disabled={isBusy} className={btnClass}>
            <span className={buttonStyles.label}>Ошибка доступа</span>
          </Button>
        </div>
      );
    }

    return null;
  };

  const dateStr = formatDate(item.created_at);
  const chatLink =
    item.tg_user_id && item.bot_id
      ? `/${locale}/inbox/chat?chat_id=${item.tg_user_id}&bot_id=${item.bot_id}`
      : null;

  const blockModalContext = getBlockModalContext(item);

  return (
    <>
      <BlockModal
        isOpen={isBlockModalOpen}
        onOpenChange={setIsBlockModalOpen}
        reason={blockModalContext.reason}
        stopWord={blockModalContext.reasonSource}
        message={item.description || ''}
        eventId={item.id}
        onSave={handleBlockSave}
        onActionResult={handleBlockModalResult}
      />
      <DesktopWrapper>
        <div
          className={`${styles.element} ${item.is_new ? styles.unread : ''} ${isChecked ? styles.checked : ''}`}
          onClick={handleRowClick}
          onPointerUp={handleRowPointerUp}
          onKeyDown={handleRowKeyDown}
          tabIndex={isSelectionMode ? 0 : -1}
          role={isSelectionMode ? "checkbox" : undefined}
          aria-checked={isSelectionMode ? Boolean(isChecked) : undefined}
        >
          <div className={styles.gridCell}>
            {isChecked !== undefined ? (
              <Checkbox checked={isChecked} onChange={handleCheck} />
            ) : item.is_new ? (
              <span className={styles.dot} />
            ) : null}
          </div>
          <div className={styles.gridCell}>{renderSource()}</div>
          <div className={styles.gridCell}>
            <span className={styles.dateTime}>{dateStr}</span>
          </div>
          <div className={styles.gridCell}>{renderEventType()}</div>
          {(item.tg_username || item.tg_first_name) ? (
            <>
              <div className={styles.gridCell}>
                {chatLink ? (
                  <Link href={chatLink} className={styles.username}>
                    {item.tg_username || item.tg_first_name}
                  </Link>
                ) : (
                  <span className={styles.username}>{item.tg_username || item.tg_first_name}</span>
                )}
              </div>
              <div className={styles.gridCell}>
                <span className={styles.commandPath}>{item.description}</span>
              </div>
            </>
          ) : (
            <div className={styles.gridCell} style={{ gridColumn: 'span 2' }}>
              <span className={styles.commandPath}>{item.description}</span>
            </div>
          )}
          <div className={styles.gridCell}>
            {renderActions()}
          </div>
        </div>
      </DesktopWrapper>
      <MobileWrapper>
        <div
          className={`${styles.elementMobileWrapper} ${item.is_new ? styles.unread : ''} ${isHolding ? styles.holding : ''} ${isChecked ? styles.checked : ''}`}
          {...(shouldEnableLongPress ? longPressProps : {})}
          onClick={handleRowClick}
          onPointerUp={handleRowPointerUp}
          onKeyDown={handleRowKeyDown}
          tabIndex={isSelectionMode ? 0 : -1}
          role={isSelectionMode ? "checkbox" : undefined}
          aria-checked={isSelectionMode ? Boolean(isChecked) : undefined}
        >
          <div className={styles.holdOverlay} />
          <div>
            {isChecked !== undefined ? (
                <Checkbox checked={isChecked} onChange={handleCheck} />
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
                  { item.tg_username || item.tg_first_name ? (
                    chatLink ? (
                      <Link href={chatLink} className={styles.username}>
                        {item.tg_username || item.tg_first_name}
                      </Link>
                    ) : (
                      <div className={styles.username}>
                        {item.tg_username || item.tg_first_name}
                      </div>
                    )
                  ) : null}
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

export default memo(ListElement);