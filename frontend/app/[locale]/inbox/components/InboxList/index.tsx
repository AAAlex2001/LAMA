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
  selectInboxItemsTotal,
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
import { useScrollContainer } from "@/components/app-layout";
import { useCheckedItems } from "./hooks/useCheckedItems";
import { useBlockConfirmation } from "./hooks/useBlockConfirmation";

interface InboxListProps {
  type: ListHeaderType;
  onHandlersReady?: (handlers: {
    handleTimeSortChange: (sort: 'new' | 'old') => void;
    handleStatusFilterChange: (status: 'new' | 'processed' | 'banned' | null) => void;
    handleEventTypeFilterChange?: (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => void;
  }) => void;
  isReady?: boolean;
}

const InboxList: FC<InboxListProps> = ({ type, onHandlersReady, isReady = true }) => {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectInboxItems);
  const itemsLoading = useAppSelector(selectInboxItemsLoading);
  const itemsHasMore = useAppSelector(selectInboxItemsHasMore);
  const itemsTotal = useAppSelector(selectInboxItemsTotal);
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

  const scrollContainer = useScrollContainer();
  const { ref: sentinelRef, inView } = useInView({ root: scrollContainer, rootMargin: '0px 0px 500px 0px' });
  const { ref: lastItemRef, inView: isLastItemInView } = useInView({ root: scrollContainer });
  const { checkedItems, isChecking, dispatch: checkedItemsDispatch } = useCheckedItems();
  const { blockConfirm, blockDispatch, confirm, cancel, onOpenChange } = useBlockConfirmation();

  const isEmpty = !itemsLoading && data.length === 0;

  const hasLoadedAllFromTotal = itemsTotal > 0 && data.length >= itemsTotal;
  const showBottomGradient = !hasLoadedAllFromTotal || !isLastItemInView;

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
    if (!isReady) return;
    checkedItemsDispatch({ type: "clear" });
    dispatch(fetchInboxEventsThunk({ ...fetchParams, offset: 0 }));
  }, [
    dispatch,
    isReady,
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
    checkedItemsDispatch({ type: "clear" });
  };

  const handleModerationSubFilterChange = (status: 'new' | 'processed' | 'banned' | null) => dispatch(setStatusFilter(status));
  const allIds = data.map((item) => item.id.toString());

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
        isOpen={blockConfirm.isOpen}
        onOpenChange={onOpenChange}
        username={blockConfirm.username}
        onConfirm={confirm}
        onCancel={cancel}
      />
      <div className={styles.container}>
        <ListHeader
          type={type}
          selectionDispatch={checkedItemsDispatch}
          isChecking={isChecking}
          allIds={allIds}
          isSelectedAll={checkedItems.size > 0 && checkedItems.size === data.length}
          checkedItems={checkedItems.size}
          onBulkAction={handleBulkAction}
          automationSubFilter={typeAutoReplies ? 'system_autoreply' : typeTriggers ? 'system_trigger' : typeCommands ? 'bot_command' : null}
          onAutomationSubFilterChange={handleEventTypeFilterChange}
          moderationSubFilter={statusFilter}
            onModerationSubFilterChange={handleModerationSubFilterChange}
        />
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <div className={styles.list}>
              {data.map((item, index) => (
                <div key={item.id} ref={index === data.length - 1 ? lastItemRef : undefined}>
                  <ListElement
                    item={item}
                    isChecked={isChecking ? checkedItems.has(item.id.toString()) : undefined}
                    selectionDispatch={checkedItemsDispatch}
                    blockDispatch={blockDispatch}
                    type={type}
                  />
                </div>
              ))}
              {itemsHasMore && !itemsLoading ? (
                <div ref={sentinelRef as React.Ref<HTMLDivElement>} className={styles.scrollSentinel} />
              ) : null}
            </div>
            {itemsLoading && data.length > 0 && (
              <div className={styles.loaderContainer} style={{ padding: '16px 0' }}>
                <Loader size={24} color="blue" />
              </div>
            )}
            {showBottomGradient && (
              <div className={styles.bottomGradient} />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default InboxList;
