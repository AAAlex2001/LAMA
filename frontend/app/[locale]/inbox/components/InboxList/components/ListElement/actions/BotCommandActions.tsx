import { FC } from "react";
import { Button } from "@/components/new-button";
import buttonStyles from "@/components/new-button/styles.module.scss";
import { DesktopWrapper, MobileWrapper } from "@/components/responsive-wrappers";
import { CheckListIcon } from "@/components/icons";
import styles from "../styles.module.scss";
import type { ActionGroupProps } from "./types";
import { getButtonStyleVars } from "./types";

export const BotCommandActions: FC<ActionGroupProps> = ({
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

  if (status === 'resolved' || status === 'deleted' || status === 'blocked' || item.payload?.handled) {
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
        intent="primary"
        size="md"
        onClick={() => handleAction('delete_message')}
        loading={loadingAction === 'delete_message'}
        disabled={isBusy}
        className={btnClass}
      >
        <span className={buttonStyles.label}>Удалить</span>
      </Button>
      <Button
        variant="ghost"
        intent="primary"
        size="transparent"
        onClick={() => handleAction('mark_resolved')}
        loading={loadingAction === 'mark_resolved'}
        disabled={isBusy}
      >
        <CheckListIcon width={24} height={24} />
      </Button>
    </div>
  );
};
