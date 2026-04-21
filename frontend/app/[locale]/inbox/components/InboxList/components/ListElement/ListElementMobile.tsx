import { FC, MouseEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import Link from "next/link";
import Checkbox from "@/components/checkbox/checkbox";
import styles from "./styles.module.scss";
import type { InboxEventResponse } from "../../../../store/thunks/inboxEvents";

interface ListElementMobileProps {
  item: InboxEventResponse;
  isChecked?: boolean;
  isSelectionMode: boolean;
  isHolding: boolean;
  chatLink: string | null;
  dateStr: string;
  sourceContent: ReactNode;
  eventTypeContent: ReactNode;
  actionsContent: ReactNode;
  onCheck: () => void;
  onRowClick: (e: MouseEvent) => void;
  onRowPointerUp: (e: ReactPointerEvent) => void;
  onRowKeyDown: (e: KeyboardEvent) => void;
  longPressProps: Record<string, unknown>;
}

export const ListElementMobile: FC<ListElementMobileProps> = ({
  item,
  isChecked,
  isSelectionMode,
  isHolding,
  chatLink,
  dateStr,
  sourceContent,
  eventTypeContent,
  actionsContent,
  onCheck,
  onRowClick,
  onRowPointerUp,
  onRowKeyDown,
  longPressProps,
}) => {
  const userLabel = item.tg_username || item.tg_first_name;

  return (
    <div
      className={`${styles.elementMobileWrapper} ${item.is_new ? styles.unread : ''} ${isHolding ? styles.holding : ''} ${isChecked ? styles.checked : ''}`}
      {...longPressProps}
      onClick={onRowClick}
      onPointerUp={onRowPointerUp}
      onKeyDown={onRowKeyDown}
      tabIndex={isSelectionMode ? 0 : -1}
      role={isSelectionMode ? "checkbox" : undefined}
      aria-checked={isSelectionMode ? Boolean(isChecked) : undefined}
    >
      <div className={styles.holdOverlay} />
      <div>
        {isChecked !== undefined ? <Checkbox checked={isChecked} onChange={onCheck} /> : null}
      </div>
      <div className={styles.elementMobile}>
        <div className={styles.wrapperMobile}>
          <div className={styles.nameContent}>
            <div className={styles.source}>
              {item.is_new && isChecked === undefined ? <span className={styles.dot} /> : null}
              {sourceContent}
            </div>
            <div className={styles.dateTime}>{dateStr}</div>
          </div>
          <div className={styles.descriptionContent}>
            <div className={styles.descriptionContentItem}>
              <div className={styles.eventType}>{eventTypeContent}</div>
              {userLabel ? (
                chatLink ? (
                  <Link href={chatLink} className={styles.username}>
                    {userLabel}
                  </Link>
                ) : (
                  <div className={styles.username}>{userLabel}</div>
                )
              ) : null}
            </div>
            <div className={styles.descriptionMobile}>{item.description}</div>
          </div>
        </div>
        <div className={styles.actionsRow}>{actionsContent}</div>
      </div>
    </div>
  );
};
