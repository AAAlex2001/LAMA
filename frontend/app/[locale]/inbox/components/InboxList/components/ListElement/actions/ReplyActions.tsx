import { FC } from "react";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import styles from "../styles.module.scss";
import { StatusText } from "./StatusText";
import type { ActionGroupProps } from "./types";
import { getButtonStyleVars } from "./types";

export const ReplyActions: FC<ActionGroupProps> = ({
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

  if (status === 'replied' || isProcessed) {
    return <StatusText>Ответ отправлен</StatusText>;
  }

  return (
    <div className={styles.actionButtons}>
      <Button
        variant="fill"
        intent="primary"
        size="md"
        onClick={() => handleAction('reply')}
        loading={loadingAction === 'reply'}
        disabled={isBusy}
        className={btnClass}
        style={{ width: btnWidth }}
      >
        <span className={buttonStyles.label}>Ответить в боте</span>
      </Button>
    </div>
  );
};
