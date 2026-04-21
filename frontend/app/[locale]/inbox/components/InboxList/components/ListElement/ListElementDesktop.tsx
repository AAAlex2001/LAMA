import { FC, MouseEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import Link from "next/link";
import Checkbox from "@/components/checkbox/checkbox";
import styles from "./styles.module.scss";
import type { InboxEventResponse } from "../../../../store/thunks/inboxEvents";

interface ListElementDesktopProps {
  item: InboxEventResponse;
  isChecked?: boolean;
  isSelectionMode: boolean;
  chatLink: string | null;
  dateStr: string;
  sourceContent: ReactNode;
  eventTypeContent: ReactNode;
  actionsContent: ReactNode;
  onCheck: () => void;
  onRowClick: (e: MouseEvent) => void;
  onRowPointerUp: (e: ReactPointerEvent) => void;
  onRowKeyDown: (e: KeyboardEvent) => void;
}

export const ListElementDesktop: FC<ListElementDesktopProps> = ({
  item,
  isChecked,
  isSelectionMode,
  chatLink,
  dateStr,
  sourceContent,
  eventTypeContent,
  actionsContent,
  onCheck,
  onRowClick,
  onRowPointerUp,
  onRowKeyDown,
}) => {
  const userLabel = item.tg_username || item.tg_first_name;

  return (
    <div
      className={`${styles.element} ${item.is_new ? styles.unread : ''} ${isChecked ? styles.checked : ''}`}
      onClick={onRowClick}
      onPointerUp={onRowPointerUp}
      onKeyDown={onRowKeyDown}
      tabIndex={isSelectionMode ? 0 : -1}
      role={isSelectionMode ? "checkbox" : undefined}
      aria-checked={isSelectionMode ? Boolean(isChecked) : undefined}
    >
      <div className={styles.gridCell}>
        {isChecked !== undefined ? (
          <Checkbox checked={isChecked} onChange={onCheck} />
        ) : item.is_new ? (
          <span className={styles.dot} />
        ) : null}
      </div>
      <div className={styles.gridCell}>{sourceContent}</div>
      <div className={styles.gridCell}>
        <span className={styles.dateTime}>{dateStr}</span>
      </div>
      <div className={styles.gridCell}>{eventTypeContent}</div>
      {userLabel ? (
        <>
          <div className={styles.gridCell}>
            {chatLink ? (
              <Link href={chatLink} className={styles.username}>
                {userLabel}
              </Link>
            ) : (
              <span className={styles.username}>{userLabel}</span>
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
      <div className={styles.gridCell}>{actionsContent}</div>
    </div>
  );
};
