import { FC } from "react";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import styles from "../styles.module.scss";
import type { ActionGroupProps } from "./types";
import { getButtonStyleVars } from "./types";

export const SystemNotificationActions: FC<ActionGroupProps> = ({
  item,
  loadingAction,
  handleAction,
  isMobile,
}) => {
  const { btnWidth } = getButtonStyleVars(isMobile);
  const btnClass = `${styles.actionButton} ${isMobile ? styles.actionButtonMobile : ''}`;
  const isBusy = loadingAction !== null;
  const isProcessed = item.status === 'processed';

  if (isProcessed) return null;

  return (
    <div className={styles.actionButtons}>
      <Button
        variant="outline"
        intent="primary"
        size="md"
        onClick={() => handleAction('ignore')}
        loading={loadingAction === 'ignore'}
        disabled={isBusy}
        className={btnClass}
        style={{ width: btnWidth }}
      >
        <span className={buttonStyles.label}>Игнорировать</span>
      </Button>
    </div>
  );
};
