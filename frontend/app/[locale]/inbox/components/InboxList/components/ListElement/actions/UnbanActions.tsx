import { FC } from "react";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import styles from "../styles.module.scss";
import type { ActionGroupProps } from "./types";
import { getButtonStyleVars } from "./types";

export const UnbanActions: FC<ActionGroupProps> = ({ loadingAction, handleAction, isMobile }) => {
  const { btnWidth } = getButtonStyleVars(isMobile);
  const btnClass = `${styles.actionButton} ${isMobile ? styles.actionButtonMobile : ''}`;
  const isBusy = loadingAction !== null;

  return (
    <div className={styles.actionButtons}>
      <Button
        variant="outline"
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
    </div>
  );
};
