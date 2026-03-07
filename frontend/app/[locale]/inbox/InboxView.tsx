'use client';

import { useEffect, useState } from "react";
import InboxList from "./components/InboxList";
import SortingBar from "./components/SortingBar";
import styles from "./styles.module.scss";
import { ListHeaderType } from "./components/InboxList/components/ListHeader";
import InboxDirect from "./components/InboxDirect";
import {
  fetchBotsThunk,
  useAppDispatch,
  useAppSelector,
  fetchChannelsThunk,
  setSelectedFilter,
  setCurrentView,
} from "./store";
import type { ListFilterType } from "./store";

const InboxView = () => {
  const dispatch = useAppDispatch();

  const selectedFilter = useAppSelector((s) => s.inbox.selectedFilter);
  const currentView = useAppSelector((s) => s.inbox.currentView);
  const [sortHandlers, setSortHandlers] = useState<{
    handleTimeSortChange: (sort: 'new' | 'old') => void;
    handleStatusFilterChange: (status: 'new' | 'processed' | 'ignored' | null) => void;
  } | null>(null);

  useEffect(() => {
    dispatch(fetchChannelsThunk({}));
    dispatch(fetchBotsThunk({}));
  }, [dispatch]);

  const handleFilterChange = (filter: ListHeaderType) => {
    dispatch(setSelectedFilter(filter as ListFilterType));
  };

  const handleViewChange = (view: "list" | "direct") => {
    dispatch(setCurrentView(view));
  };

  return (
    <div className={`${styles.container} ${currentView === "list" ? styles.list : styles.direct}`}>
      <SortingBar 
        selectedFilter={selectedFilter as ListHeaderType} 
        setSelectedFilter={handleFilterChange} 
        currentView={currentView} 
        setCurrentView={handleViewChange} 
        onTimeSortChange={sortHandlers?.handleTimeSortChange}
        onStatusFilterChange={sortHandlers?.handleStatusFilterChange}
      />
      {currentView === "list" && (
        <InboxList 
          type={selectedFilter as ListHeaderType} 
          onHandlersReady={setSortHandlers}
        />
      )}
      {currentView === "direct" && <InboxDirect onClose={() => handleViewChange("list")} />}
    </div>
  )
}

export default InboxView;
