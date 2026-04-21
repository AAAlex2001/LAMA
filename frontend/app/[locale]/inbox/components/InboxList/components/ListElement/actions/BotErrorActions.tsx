import { FC } from "react";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import styles from "../styles.module.scss";
import type { ActionGroupProps } from "./types";

export const BotErrorActions: FC<ActionGroupProps> = ({
  loadingAction,
  handleAction,
  isMobile,
}) => {
  const btnClass = `${styles.actionButton} ${isMobile ? styles.actionButtonMobile : ''}`;
  const isBusy = loadingAction !== null;

  return (
    <div className={styles.actionButtons}>
      <Button
        variant="outline"
        intent="destructive"
        size="md"
        onClick={() => handleAction('mark_resolved')}
        loading={loadingAction === 'mark_resolved'}
        disabled={isBusy}
        className={btnClass}
      >
        <span className={buttonStyles.label}>Ошибка доступа</span>
      </Button>
    </div>
  );
};
