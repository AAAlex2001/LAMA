import { FC } from "react";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import styles from "../styles.module.scss";
import { StatusText } from "./StatusText";
import type { ActionGroupProps } from "./types";
import { getButtonStyleVars } from "./types";

export const JoinRequestActions: FC<ActionGroupProps> = ({
  item,
  blockStatus,
  loadingAction,
  handleAction,
  isMobile,
}) => {
  const { btnWidth } = getButtonStyleVars(isMobile);
  const btnClass = `${styles.actionButton} ${isMobile ? styles.actionButtonMobile : ''}`;
  const status = blockStatus?.status;
  const isBusy = loadingAction !== null;
  const isProcessed = item.status === 'processed';
  const isLinkJoin = item.event_type === 'channel_link_join';

  const isAccepted = status === 'accepted' || (!isLinkJoin && item.payload?.join_state === 'accepted');
  const isRejected = status === 'rejected' || (!isLinkJoin && item.payload?.join_state === 'rejected');

  if (isAccepted) return <StatusText>Принята</StatusText>;
  if (isRejected) return <StatusText variant="declined">Отклонена</StatusText>;
  if (isLinkJoin && isProcessed) return null;

  return (
    <div className={styles.actionButtons}>
      <Button
        variant="fill"
        intent="primary"
        size="md"
        onClick={() => handleAction('accept')}
        loading={loadingAction === 'accept'}
        disabled={isBusy}
        className={btnClass}
        style={{ width: btnWidth }}
      >
        <span className={buttonStyles.label}>Принять</span>
      </Button>
      <Button
        variant="outline"
        intent="primary"
        size="md"
        onClick={() => handleAction('reject')}
        loading={loadingAction === 'reject'}
        disabled={isBusy}
        className={btnClass}
      >
        <span className={buttonStyles.label}>Отклонить</span>
      </Button>
    </div>
  );
};
