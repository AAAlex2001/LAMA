'use client';

import { FC, useEffect } from 'react';
import ListElement from './components/ListElement';
import styles from './styles.module.scss';
import ListHeader, { ListHeaderType } from './components/ListHeader';
import EmptyState from '../EmptyState';
import Loader from '@/components/loader/loader';
import ConfirmBlockModal from '../ConfirmBlockModal';
import {
  useInboxEventsQuery,
  useBulkInboxActionMutation,
  type InboxCategory,
} from '@/store/inbox';
import { useInView } from '@/hooks/useInView';
import { useScrollContainer } from '@/components/app-layout';
import {
  useAppDispatch,
  useAppSelector,
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
} from '../../store';
import type { ListFilterType } from '../../store';
import { useCheckedItems } from './hooks/useCheckedItems';
import { useBlockConfirmation } from './hooks/useBlockConfirmation';

const CATEGORY_MAP: Record<ListFilterType, InboxCategory | undefined> = {
  all: undefined,
  moderation: 'moderation',
  system: 'system',
  automation: 'automation',
};

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

  const eventsQuery = useInboxEventsQuery({
    category: CATEGORY_MAP[selectedFilter as ListFilterType],
    status: statusFilter,
    sort: sortDir,
    botIds,
    channelIds,
    system,
    typeAutoReplies,
    typeTriggers,
    typeCommands,
    search,
  });

  const items = eventsQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const itemsLoading = eventsQuery.isLoading || eventsQuery.isFetchingNextPage;
  const itemsHasMore = eventsQuery.hasNextPage ?? false;
  const itemsTotal = eventsQuery.data?.pages[0]?.total ?? 0;

  const bulkAction = useBulkInboxActionMutation();

  const scrollContainer = useScrollContainer();
  const { ref: sentinelRef, inView } = useInView({ root: scrollContainer, rootMargin: '0px 0px 500px 0px' });
  const { ref: lastItemRef, inView: isLastItemInView } = useInView({ root: scrollContainer });
  const { checkedItems, isChecking, dispatch: checkedItemsDispatch } = useCheckedItems();
  const { blockConfirm, blockDispatch, confirm, cancel, onOpenChange } = useBlockConfirmation();

  const isEmpty = !itemsLoading && items.length === 0;
  const hasLoadedAllFromTotal = itemsTotal > 0 && items.length >= itemsTotal;
  const showBottomGradient = !hasLoadedAllFromTotal || !isLastItemInView;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHandlersReady]);

  useEffect(() => {
    if (!isReady) return;
    checkedItemsDispatch({ type: 'clear' });
  }, [
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
    checkedItemsDispatch,
  ]);

  useEffect(() => {
    if (inView && itemsHasMore && !itemsLoading) {
      eventsQuery.fetchNextPage();
    }
  }, [inView, itemsHasMore, itemsLoading, eventsQuery]);

  const handleBulkAction = (action: 'read' | 'ignore' | 'delete' | 'block' | 'unblock') => {
    const eventIds = Array.from(checkedItems).map(Number);
    if (eventIds.length === 0) return;
    bulkAction.mutate({ event_ids: eventIds, action });
    checkedItemsDispatch({ type: 'clear' });
  };

  const handleModerationSubFilterChange = (status: 'new' | 'processed' | 'banned' | null) =>
    dispatch(setStatusFilter(status));
  const allIds = items.map((item) => item.id.toString());

  if (eventsQuery.isLoading && items.length === 0) {
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
          isSelectedAll={checkedItems.size > 0 && checkedItems.size === items.length}
          checkedItems={checkedItems.size}
          onBulkAction={handleBulkAction}
          automationSubFilter={
            typeAutoReplies ? 'system_autoreply'
              : typeTriggers ? 'system_trigger'
                : typeCommands ? 'bot_command'
                  : null
          }
          onAutomationSubFilterChange={handleEventTypeFilterChange}
          moderationSubFilter={statusFilter}
          onModerationSubFilterChange={handleModerationSubFilterChange}
        />
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <div className={styles.list}>
              {items.map((item, index) => (
                <div key={item.id} ref={index === items.length - 1 ? lastItemRef : undefined}>
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
            {itemsLoading && items.length > 0 && (
              <div className={styles.loaderContainer} style={{ padding: '16px 0' }}>
                <Loader size={24} color="blue" />
              </div>
            )}
            {showBottomGradient && <div className={styles.bottomGradient} />}
          </>
        )}
      </div>
    </>
  );
};

export default InboxList;
