import { FC } from "react";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import styles from "../styles.module.scss";
import { StatusText } from "./StatusText";
import type { ActionGroupProps } from "./types";
import { getButtonStyleVars } from "./types";

export const ChannelBanActions: FC<ActionGroupProps> = ({
  item,
  blockStatus,
  loadingAction,
  handleAction,
  setIsBlockModalOpen,
  isMobile,
}) => {
  const { btnWidth } = getButtonStyleVars(isMobile);
  const btnClass = `${styles.actionButton} ${isMobile ? styles.actionButtonMobile : ''}`;
  const status = blockStatus?.status;
  const isBusy = loadingAction !== null;
  const isProcessed = item.status === 'processed';
  const triggerAction = typeof item.payload?.action === 'string' ? item.payload.action : null;

  if (triggerAction === 'UNBAN_USER') return <StatusText>Разблокирован триггером</StatusText>;
  if (triggerAction === 'REMOVE_FROM_GROUP') return <StatusText>Удалён из группы</StatusText>;
  if (status === 'unbanned') return <StatusText>Разблокирован</StatusText>;
  if (status === 'ban_updated') return <StatusText>Блокировка обновлена</StatusText>;
  if (status === 'blocked') return <StatusText>Заблокирован</StatusText>;
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
      <Button
        variant="outline"
        intent="primary"
        size="md"
        onClick={() => setIsBlockModalOpen(true)}
        disabled={isBusy}
        className={btnClass}
      >
        <span className={buttonStyles.label}>Настройки</span>
      </Button>
    </div>
  );
};
