import { FC, useState, useRef, useEffect } from "react";
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
  specificInboxActionThunk,
  fetchInboxEventsThunk,
  selectInboxItems,
  selectInboxItemsLoading,
  selectInboxItemsHasMore,
  selectInboxItemsOffset,
  selectSortDir,
  selectStatusFilter,
  selectSelectedFilter,
  selectEventTypeFilter,
  selectEntityIds,
  selectSearch,
  setSortDir,
  setStatusFilter,
  setEventTypeFilter,
} from "../../store";
import type { ListFilterType, InboxEventResponse, InboxActionType } from "../../store";

const CATEGORY_MAP: Record<ListFilterType, string | undefined> = {
  all: undefined,
  moderation: 'moderation',
  system: 'system',
  automation: 'automation',
};

interface InboxListProps {
  type: ListHeaderType;
  onHandlersReady?: (handlers: {
    handleTimeSortChange: (sort: 'new' | 'old') => void;
    handleStatusFilterChange: (status: 'new' | 'processed' | 'ignored' | null) => void;
    handleEventTypeFilterChange?: (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => void;
  }) => void;
}

const InboxList: FC<InboxListProps> = ( { type, onHandlersReady } ) => {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectInboxItems);
  const itemsLoading = useAppSelector(selectInboxItemsLoading);
  const itemsHasMore = useAppSelector(selectInboxItemsHasMore);
  const itemsOffset = useAppSelector(selectInboxItemsOffset);
  const selectedFilter = useAppSelector(selectSelectedFilter);
  const sortDir = useAppSelector(selectSortDir);
  const statusFilter = useAppSelector(selectStatusFilter);
  const eventTypeFilter = useAppSelector(selectEventTypeFilter);
  const entityIds = useAppSelector(selectEntityIds);
  const search = useAppSelector(selectSearch);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [isLastElementVisible, setIsLastElementVisible] = useState(false);
  const lastElementRef = useRef<HTMLDivElement>(null);
  const [isConfirmBlockModalOpen, setIsConfirmBlockModalOpen] = useState(false);
  const [pendingBlockAction, setPendingBlockAction] = useState<{
    eventId: number;
    payload?: Record<string, unknown>;
    username?: string;
  } | null>(null);

  const isEmpty = !itemsLoading && data.length === 0;

  const handleTimeSortChange = (sort: 'new' | 'old') => {
    dispatch(setSortDir(sort));
  };

  const handleStatusFilterChange = (status: 'new' | 'processed' | 'ignored' | null) => {
    dispatch(setStatusFilter(status));
  };

  const handleEventTypeFilterChange = (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => {
    dispatch(setEventTypeFilter(eventType));
  };

  useEffect(() => {
    if (onHandlersReady) {
      onHandlersReady({
        handleTimeSortChange,
        handleStatusFilterChange,
        handleEventTypeFilterChange,
      });
    }
  }, [onHandlersReady]);

  useEffect(() => {
    const category = CATEGORY_MAP[selectedFilter as ListFilterType];
    dispatch(fetchInboxEventsThunk({
      category: category as any,
      status: statusFilter ?? undefined,
      sort: sortDir,
      event_types: eventTypeFilter ? [eventTypeFilter as any] : undefined,
      entity_ids: entityIds && entityIds.length > 0 ? entityIds : undefined,
      search: search ?? undefined,
      offset: 0,
      limit: 50,
    }));
  }, [dispatch, selectedFilter, sortDir, statusFilter, eventTypeFilter, entityIds, search]);

  useEffect(() => {
    if (!lastElementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsLastElementVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
      }
    );

    observer.observe(lastElementRef.current);

    return () => {
      if (lastElementRef.current) {
        observer.unobserve(lastElementRef.current);
      }
    };
  }, [data]);

  useEffect(() => {
    if (isLastElementVisible && itemsHasMore && !itemsLoading && data.length > 0) {
      const category = CATEGORY_MAP[selectedFilter as ListFilterType];
      dispatch(fetchInboxEventsThunk({
        category: category as any,
        status: statusFilter ?? undefined,
        sort: sortDir,
        event_types: eventTypeFilter ? [eventTypeFilter as any] : undefined,
        entity_ids: entityIds && entityIds.length > 0 ? entityIds : undefined,
        search: search ?? undefined,
        offset: itemsOffset,
        limit: 50,
      }));
    }
  }, [isLastElementVisible, itemsHasMore, itemsLoading, data.length, dispatch, selectedFilter, sortDir, statusFilter, eventTypeFilter, entityIds, search, itemsOffset]);

  const handleCheck = (id: string) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(id)) {
      newCheckedItems.delete(id);
    } else {
      newCheckedItems.add(id);
    }
    setCheckedItems(newCheckedItems);
  }
  const handleSelectAll = () => {
    const allIds = new Set<string>(data.map((item: InboxEventResponse) => item.id.toString()));
    const allSelected = allIds.size > 0 && allIds.size === checkedItems.size &&
      Array.from(allIds).every((id: string) => checkedItems.has(id));

    if (allSelected) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(allIds);
      if (!isChecking) {
        setIsChecking(true);
      }
    }
  }

  const handleSetIsChanging = (isChanging: boolean) => {
    if (!isChanging) {
      setCheckedItems(new Set());
    }
    setIsChecking(isChanging);
  }

  const handleOnHold = (id: string) => {
    setIsChecking(true);
    setCheckedItems(new Set([id]));
  }

  const handleBulkAction = (action: 'read' | 'ignore' | 'delete' | 'block' | 'unblock') => {
    const eventIds = Array.from(checkedItems).map(Number);
    if (eventIds.length === 0) return;
    dispatch(bulkInboxActionThunk({ event_ids: eventIds, action }));
    setCheckedItems(new Set());
    setIsChecking(false);
  };

  const handleSpecificAction = (eventId: number, actionType: InboxActionType, payload?: Record<string, unknown>) => {
    if (actionType === 'block') {
      const item = data.find((item: InboxEventResponse) => item.id === eventId);
      setPendingBlockAction({
        eventId,
        payload,
        username: item?.tg_username || undefined,
      });
      setIsConfirmBlockModalOpen(true);
      return Promise.resolve();
    }
    return dispatch(specificInboxActionThunk({ eventId, action_type: actionType, payload }));
  };

  const handleConfirmBlock = () => {
    if (pendingBlockAction) {
      dispatch(specificInboxActionThunk({
        eventId: pendingBlockAction.eventId,
        action_type: 'block',
        payload: pendingBlockAction.payload,
      }));
      setPendingBlockAction(null);
    }
  };

  const handleCancelBlock = () => {
    setPendingBlockAction(null);
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
        isOpen={isConfirmBlockModalOpen}
        onOpenChange={setIsConfirmBlockModalOpen}
        username={pendingBlockAction?.username}
        onConfirm={handleConfirmBlock}
        onCancel={handleCancelBlock}
      />
      <div className={styles.container}>
        <ListHeader
        type={type}
        setIsChecking={handleSetIsChanging}
        isChecking={isChecking}
        onSelectAll={handleSelectAll}
        isSelectedAll={checkedItems.size > 0 && checkedItems.size === data.length}
        checkedItems={checkedItems.size}
        onBulkAction={handleBulkAction}
        automationSubFilter={eventTypeFilter}
        onAutomationSubFilterChange={handleEventTypeFilterChange}
        moderationSubFilter={statusFilter}
        onModerationSubFilterChange={handleStatusFilterChange}
      />
      {isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <div className={styles.list}>
            {data.map((item: InboxEventResponse, index: number) => (
              <div
                key={item.id}
                ref={index === data.length - 1 ? lastElementRef : null}
              >
                <ListElement
                  item={item}
                  isChecked={isChecking ? checkedItems.has(item.id.toString()) : undefined}
                  onCheck={() => handleCheck(item.id.toString())}
                  onHold={() => handleOnHold(item.id.toString())}
                  type={type}
                  onSpecificAction={handleSpecificAction}
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
        </>
      )}
      </div>
    </>
  )
}

export default InboxList;
