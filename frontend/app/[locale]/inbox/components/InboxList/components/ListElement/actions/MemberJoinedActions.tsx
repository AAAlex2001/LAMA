import { FC } from "react";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import styles from "../styles.module.scss";
import type { ActionGroupProps } from "./types";
import { getButtonStyleVars } from "./types";

export const MemberJoinedActions: FC<ActionGroupProps> = ({
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

  if (status === 'deleted' || status === 'blocked' || isProcessed) return null;

  return (
    <div className={styles.actionButtons}>
      <Button
        variant="fill"
        intent="primary"
        size="md"
        onClick={() => handleAction('block')}
        disabled={isBusy}
        className={btnClass}
        style={{ width: btnWidth }}
      >
        <span className={buttonStyles.label}>Заблокировать</span>
      </Button>
      <Button
        variant="outline"
        intent="destructive"
        size="md"
        onClick={() => handleAction('delete_message')}
        loading={loadingAction === 'delete_message'}
        disabled={isBusy}
        className={btnClass}
      >
        <span className={buttonStyles.label}>Удалить сообщение</span>
      </Button>
    </div>
  );
};
