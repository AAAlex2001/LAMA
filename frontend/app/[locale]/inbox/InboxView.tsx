'use client';

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import InboxList from "./components/InboxList";
import InboxSortingBar from "./components/InboxSortingBar";
import styles from "./styles.module.scss";
import { ListHeaderType } from "./components/InboxList/components/ListHeader";
import {
  useAppDispatch,
  useAppSelector,
  setSelectedFilter,
  selectSelectedFilter,
} from "./store";
import type { ListFilterType } from "./store";

const InboxView = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { locale } = useParams();

  const selectedFilter = useAppSelector(selectSelectedFilter);
  const [sortHandlers, setSortHandlers] = useState<{
    handleTimeSortChange: (sort: 'new' | 'old') => void;
    handleStatusFilterChange: (status: 'new' | 'processed' | 'banned' | null) => void;
    handleEventTypeFilterChange?: (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => void;
  } | null>(null);

  const handleFilterChange = (filter: ListHeaderType) => {
    dispatch(setSelectedFilter(filter as ListFilterType));
  };

  const handleNavigateToDirect = () => {
    router.push(`/${locale}/inbox/chat`);
  };

  return (
    <div className={`${styles.container} ${styles.list}`}>
      <InboxSortingBar
        selectedFilter={selectedFilter as ListHeaderType}
        setSelectedFilter={handleFilterChange}
        onNavigateToOtherView={handleNavigateToDirect}
        onTimeSortChange={sortHandlers?.handleTimeSortChange}
        onStatusFilterChange={sortHandlers?.handleStatusFilterChange}
        onEventTypeFilterChange={sortHandlers?.handleEventTypeFilterChange}
      />
      <InboxList
        type={selectedFilter as ListHeaderType}
        onHandlersReady={setSortHandlers}
      />
    </div>
  )
}

export default InboxView;