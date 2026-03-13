import { FC, useEffect } from "react";
import ListElement from "./components/ListElement";
import styles from "./styles.module.scss";
import ListHeader, { ListHeaderType } from "./components/ListHeader";
import EmptyState from "../EmptyState";
import Loader from "@/components/loader/loader";
import ConfirmBlockModal from "../ConfirmBlockModal";
import {
  useAppDispatch,
  useAppSelector,
  bulkInboxActionThunk,
  fetchInboxEventsThunk,
  fetchMoreInboxEventsThunk,
  selectInboxItems,
  selectInboxItemsLoading,
  selectInboxItemsHasMore,
  selectSortDir,
  selectStatusFilter,
  selectSelectedFilter,
  selectBotIds,
  selectChannelIds,
  selectSystem,
  selectTypeAutoReplies,
  selectTypeTriggers,
  selectTypeCommands,
  selectSearch,
  setSortDir,
  setStatusFilter,
  setTypeAutoReplies,
  setTypeTriggers,
  setTypeCommands,
} from "../../store";
import type { InboxCategory, ListFilterType } from "../../store";
import { CATEGORY_MAP } from "../../store/thunks/inboxEvents";
import { useInView } from "@/app/[locale]/calendar/store/useInView";
import { useCheckedItems } from "./hooks/useCheckedItems";
import { useBlockConfirmation } from "./hooks/useBlockConfirmation";

interface InboxListProps {
  type: ListHeaderType;
  onHandlersReady?: (handlers: {
    handleTimeSortChange: (sort: 'new' | 'old') => void;
    handleStatusFilterChange: (status: 'new' | 'processed' | 'banned' | null) => void;
    handleEventTypeFilterChange?: (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => void;
  }) => void;
}

const InboxList: FC<InboxListProps> = ({ type, onHandlersReady }) => {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectInboxItems);
  const itemsLoading = useAppSelector(selectInboxItemsLoading);
  const itemsHasMore = useAppSelector(selectInboxItemsHasMore);
  const selectedFilter = useAppSelector(selectSelectedFilter);
  const sortDir = useAppSelector(selectSortDir);
  const statusFilter = useAppSelector(selectStatusFilter);
  const botIds = useAppSelector(selectBotIds);
  const channelIds = useAppSelector(selectChannelIds);
  const system = useAppSelector(selectSystem);
  const typeAutoReplies = useAppSelector(selectTypeAutoReplies);
  const typeTriggers = useAppSelector(selectTypeTriggers);
  const typeCommands = useAppSelector(selectTypeCommands);
  const search = useAppSelector(selectSearch);

  const { ref: sentinelRef, inView } = useInView({ threshold: 0.1 });
  const isLastElementVisible = inView && itemsHasMore && !itemsLoading;
  const { checkedItems, isChecking, toggle, selectAll, holdSelect, setMode, clear } = useCheckedItems(data);
  const { blockModal, handleAction } = useBlockConfirmation(data);

  const isEmpty = !itemsLoading && data.length === 0;

  const fetchParams = {
    category: CATEGORY_MAP[selectedFilter as ListFilterType] as InboxCategory,
    status: statusFilter ?? undefined,
    sort: sortDir,
    bot_ids: botIds?.length ? botIds : undefined,
    channel_ids: channelIds?.length ? channelIds : undefined,
    system,
    type_auto_replies: typeAutoReplies,
    type_triggers: typeTriggers,
    type_commands: typeCommands,
    search: search ?? undefined,
    limit: 50,
  };

  const handleEventTypeFilterChange = (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => {
    dispatch(setTypeAutoReplies(eventType === 'system_autoreply' ? true : null));
    dispatch(setTypeTriggers(eventType === 'system_trigger' ? true : null));
    dispatch(setTypeCommands(eventType === 'bot_command' ? true : null));
  };

  useEffect(() => {
    onHandlersReady?.({
      handleTimeSortChange: (sort) => dispatch(setSortDir(sort)),
      handleStatusFilterChange: (status) => dispatch(setStatusFilter(status)),
      handleEventTypeFilterChange,
    });
  }, [onHandlersReady]);

  useEffect(() => {
    dispatch(fetchInboxEventsThunk({ ...fetchParams, offset: 0 }));
  }, [
    dispatch, 
    selectedFilter, 
    statusFilter, 
    sortDir, 
    botIds, 
    channelIds, 
    system, 
    typeAutoReplies, 
    typeTriggers, 
    typeCommands, 
    search,
  ]);

  useEffect(() => {
    if (inView && itemsHasMore && !itemsLoading) {
      dispatch(fetchMoreInboxEventsThunk());
    }
  }, [inView, itemsHasMore, itemsLoading, dispatch]);

  const handleBulkAction = (action: 'read' | 'ignore' | 'delete' | 'block' | 'unblock') => {
    const eventIds = Array.from(checkedItems).map(Number);
    if (eventIds.length === 0) return;
    dispatch(bulkInboxActionThunk({ event_ids: eventIds, action }));
    clear();
  };

  if (itemsLoading && data.length === 0) {
    return (
      <div className={styles.loaderContainer}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  return (
    <>
      <ConfirmBlockModal
        isOpen={blockModal.isOpen}
        onOpenChange={blockModal.setIsOpen}
        username={blockModal.username}
        onConfirm={blockModal.confirm}
        onCancel={blockModal.cancel}
      />
      <div className={styles.container}>
        <ListHeader
          type={type}
          setIsChecking={setMode}
          isChecking={isChecking}
          onSelectAll={selectAll}
          isSelectedAll={checkedItems.size > 0 && checkedItems.size === data.length}
          checkedItems={checkedItems.size}
          onBulkAction={handleBulkAction}
          automationSubFilter={typeAutoReplies ? 'system_autoreply' : typeTriggers ? 'system_trigger' : typeCommands ? 'bot_command' : null}
          onAutomationSubFilterChange={handleEventTypeFilterChange}
          moderationSubFilter={statusFilter}
          onModerationSubFilterChange={(status) => dispatch(setStatusFilter(status))}
        />
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <div className={styles.list}>
              {data.map((item) => (
                <div key={item.id}>
                  <ListElement
                    item={item}
                    isChecked={isChecking ? checkedItems.has(item.id.toString()) : undefined}
                    onCheck={toggle}
                    onHold={holdSelect}
                    type={type}
                    onSpecificAction={handleAction}
                  />
                </div>
              ))}
            </div>
            {itemsLoading && data.length > 0 && (
              <div className={styles.loaderContainer} style={{ padding: '16px 0' }}>
                <Loader size={24} color="blue" />
              </div>
            )}
            {!isLastElementVisible && <div className={styles.bottomGradient} />}
            {itemsHasMore && !itemsLoading && (
              <div ref={sentinelRef as React.Ref<HTMLDivElement>} className={styles.scrollSentinel} />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default InboxList;
