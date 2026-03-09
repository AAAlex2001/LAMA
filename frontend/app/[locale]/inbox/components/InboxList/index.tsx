import { FC, useState, useRef, useEffect, useCallback } from "react";
import ListElement from "./components/ListElement";
import styles from "./styles.module.scss";
import ListHeader, { ListHeaderType } from "./components/ListHeader";
import EmptyState from "../EmptyState";
import Loader from "@/components/loader/loader";
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
  setSortDir,
  setStatusFilter,
  setEventTypeFilter,
} from "../../store";
import type { ListFilterType } from "../../store";

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
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [isLastElementVisible, setIsLastElementVisible] = useState(false);
  const lastElementRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(false);

  const isEmpty = !itemsLoading && data.length === 0;

  const handleTimeSortChange = useCallback((sort: 'new' | 'old') => {
    dispatch(setSortDir(sort));
  }, [dispatch]);

  const handleStatusFilterChange = useCallback((status: 'new' | 'processed' | 'ignored' | null) => {
    dispatch(setStatusFilter(status));
  }, [dispatch]);

  const handleEventTypeFilterChange = useCallback((eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => {
    dispatch(setEventTypeFilter(eventType));
  }, [dispatch]);

  useEffect(() => {
    if (onHandlersReady) {
      onHandlersReady({
        handleTimeSortChange,
        handleStatusFilterChange,
        handleEventTypeFilterChange,
      });
    }
  }, [onHandlersReady, handleTimeSortChange, handleStatusFilterChange, handleEventTypeFilterChange]);

  useEffect(() => {
    const category = CATEGORY_MAP[selectedFilter];
    dispatch(fetchInboxEventsThunk({
      category: category as any,
      status: statusFilter ?? undefined,
      sort: sortDir,
      event_types: eventTypeFilter ? [eventTypeFilter as any] : undefined,
      offset: 0,
      limit: 50,
    }));
  }, [dispatch, selectedFilter, sortDir, statusFilter, eventTypeFilter]);

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
      const category = CATEGORY_MAP[selectedFilter];
      dispatch(fetchInboxEventsThunk({
        category: category as any,
        status: statusFilter ?? undefined,
        sort: sortDir,
        event_types: eventTypeFilter ? [eventTypeFilter as any] : undefined,
        offset: itemsOffset,
        limit: 50,
      }));
    }
  }, [isLastElementVisible, itemsHasMore, itemsLoading, data.length, dispatch, selectedFilter, sortDir, statusFilter, eventTypeFilter, itemsOffset]);

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
    const allIds = new Set(data.map(item => item.id.toString()));
    const allSelected = allIds.size > 0 && allIds.size === checkedItems.size &&
      Array.from(allIds).every(id => checkedItems.has(id));

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

  const handleBulkAction = useCallback((action: 'read' | 'ignore' | 'delete' | 'block' | 'unblock') => {
    const eventIds = Array.from(checkedItems).map(Number);
    if (eventIds.length === 0) return;
    dispatch(bulkInboxActionThunk({ event_ids: eventIds, action }));
    setCheckedItems(new Set());
    setIsChecking(false);
  }, [dispatch, checkedItems]);

  const handleSpecificAction = useCallback((eventId: number, actionType: string, payload?: Record<string, unknown>) => {
    return dispatch(specificInboxActionThunk({ eventId, action_type: actionType, payload }));
  }, [dispatch]);

  if (itemsLoading && data.length === 0) {
    return (
      <div className={styles.loaderContainer}>
        <Loader size={32} color="blue" />
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState />;
  }

  return (
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
      />
      <div className={styles.list}>
        {data.map((item, index) => (
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
    </div>
  )
}

export default InboxList;
