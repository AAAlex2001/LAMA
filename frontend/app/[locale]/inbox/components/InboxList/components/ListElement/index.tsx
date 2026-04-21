import { FC, memo, useState } from "react";
import { useParams } from "next/navigation";
import { DesktopWrapper, MobileWrapper } from "@/components/responsive-wrappers";
import BlockModal, { BlockModalData } from "@/app/[locale]/inbox/components/BlockModal";
import styles from "./styles.module.scss";
import { useLongPress } from "./hooks/useLongPress";
import { useInboxEventActions } from "./hooks/useInboxEventActions";
import { useRowInteraction } from "./hooks/useRowInteraction";
import { formatDate } from "./utils/formatDate";
import { getSourceDisplayText, getBlockModalContext, EVENT_TYPE_LABELS } from "./utils/labels";
import { ActionGroup } from "./actions/ActionGroup";
import { ListElementDesktop } from "./ListElementDesktop";
import { ListElementMobile } from "./ListElementMobile";
import { ListHeaderType } from "../ListHeader";
import type {
  InboxEventResponse,
  SpecificActionResponse,
} from "../../../../store/thunks/inboxEvents";
import type { CheckedItemsAction } from "../../hooks/useCheckedItems";

interface ListElementProps {
  item: InboxEventResponse;
  isChecked?: boolean;
  type?: ListHeaderType;
  selectionDispatch?: React.Dispatch<CheckedItemsAction>;
  blockDispatch?: React.Dispatch<{
    type: "open";
    eventId: number;
    username?: string;
    payload?: Record<string, unknown>;
  }>;
}

const ListElement: FC<ListElementProps> = ({
  item,
  isChecked,
  type,
  selectionDispatch,
  blockDispatch,
}) => {
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const { locale } = useParams();

  const { blockStatus, loadingAction, handleAction, saveActionResult } = useInboxEventActions({
    item,
    blockDispatch,
  });

  const isSelectionMode = isChecked !== undefined;
  const { handleCheck, handleHold, handleRowClick, handleRowPointerUp, handleRowKeyDown } =
    useRowInteraction({
      itemId: item.id.toString(),
      isSelectionMode,
      selectionDispatch,
    });

  const longPressProps = useLongPress({
    duration: 800,
    onLongPress: handleHold,
    onHoldStart: () => setIsHolding(true),
    onHoldCancel: () => setIsHolding(false),
  });

  const shouldEnableLongPress = type === 'all';

  const handleBlockSave = (_data: BlockModalData) => {
    setIsBlockModalOpen(false);
  };

  const handleBlockModalResult = (response: SpecificActionResponse) => {
    saveActionResult(response);
  };

  const dateStr = formatDate(item.created_at);
  const chatLink =
    item.tg_user_id && item.bot_id
      ? `/${locale}/inbox/chat?chat_id=${item.tg_user_id}&bot_id=${item.bot_id}`
      : null;
  const blockModalContext = getBlockModalContext(item);

  const sourceContent = (
    <div className={styles.sourceInner}>
      <span className={styles.sourceLabel}>{getSourceDisplayText(item)}</span>
    </div>
  );
  const eventTypeContent = (
    <span className={styles.eventType}>
      {EVENT_TYPE_LABELS[item.event_type] || item.event_type}
    </span>
  );

  const desktopActions = (
    <ActionGroup
      item={item}
      blockStatus={blockStatus}
      loadingAction={loadingAction}
      handleAction={handleAction}
      setIsBlockModalOpen={setIsBlockModalOpen}
    />
  );
  const mobileActions = (
    <ActionGroup
      item={item}
      blockStatus={blockStatus}
      loadingAction={loadingAction}
      handleAction={handleAction}
      setIsBlockModalOpen={setIsBlockModalOpen}
      isMobile
    />
  );

  return (
    <>
      <BlockModal
        isOpen={isBlockModalOpen}
        onOpenChange={setIsBlockModalOpen}
        reason={blockModalContext.reason}
        stopWord={blockModalContext.reasonSource}
        message={item.description || ''}
        eventId={item.id}
        onSave={handleBlockSave}
        onActionResult={handleBlockModalResult}
      />
      <DesktopWrapper>
        <ListElementDesktop
          item={item}
          isChecked={isChecked}
          isSelectionMode={isSelectionMode}
          chatLink={chatLink}
          dateStr={dateStr}
          sourceContent={sourceContent}
          eventTypeContent={eventTypeContent}
          actionsContent={desktopActions}
          onCheck={handleCheck}
          onRowClick={handleRowClick}
          onRowPointerUp={handleRowPointerUp}
          onRowKeyDown={handleRowKeyDown}
        />
      </DesktopWrapper>
      <MobileWrapper>
        <ListElementMobile
          item={item}
          isChecked={isChecked}
          isSelectionMode={isSelectionMode}
          isHolding={isHolding}
          chatLink={chatLink}
          dateStr={dateStr}
          sourceContent={sourceContent}
          eventTypeContent={eventTypeContent}
          actionsContent={mobileActions}
          onCheck={handleCheck}
          onRowClick={handleRowClick}
          onRowPointerUp={handleRowPointerUp}
          onRowKeyDown={handleRowKeyDown}
          longPressProps={shouldEnableLongPress ? longPressProps : {}}
        />
      </MobileWrapper>
    </>
  );
};

export default memo(ListElement);
