'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import InboxList from "./components/InboxList";
import InboxSortingBar from "./components/InboxSortingBar";
import styles from "./styles.module.scss";
import { ListHeaderType } from "./components/InboxList/components/ListHeader";
import {
  useAppDispatch,
  useAppSelector,
  setSelectedFilter,
  selectSelectedFilter,
  setSortDir,
  setStatusFilter,
  setBotIds,
  setChannelIds,
  setSystem,
  setTypeAutoReplies,
  setTypeTriggers,
  setTypeCommands,
  setSearch,
  selectSortDir,
  selectStatusFilter,
  selectBotIds,
  selectChannelIds,
  selectSystem,
  selectTypeAutoReplies,
  selectTypeTriggers,
  selectTypeCommands,
  selectSearch,
} from "./store";
import type { ListFilterType } from "./store";

const InboxView = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { locale } = useParams();
  const searchParams = useSearchParams();
  const hasInitialUrlParams = (searchParams?.toString() ?? "").length > 0;

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

  const [sortHandlers, setSortHandlers] = useState<{
    handleTimeSortChange: (sort: 'new' | 'old') => void;
    handleStatusFilterChange: (status: 'new' | 'processed' | 'banned' | null) => void;
    handleEventTypeFilterChange?: (eventType: 'system_autoreply' | 'system_trigger' | 'bot_command' | null) => void;
  } | null>(null);

  const [initialized, setInitialized] = useState(!hasInitialUrlParams);
  const isUrlHydrated = initialized;

  useEffect(() => {
    if (initialized) return;
    
    const filter = searchParams?.get('filter') as ListFilterType | null;
    const sort = searchParams?.get('sort') as 'new' | 'old' | null;
    const status = searchParams?.get('status') as 'new' | 'processed' | 'banned' | null;
    const botIdsParam = searchParams?.get('bot_ids');
    const channelIdsParam = searchParams?.get('channel_ids');
    const systemParam = searchParams?.get('system');
    const typeAutoRepliesParam = searchParams?.get('type_auto_replies');
    const typeTriggersParam = searchParams?.get('type_triggers');
    const typeCommandsParam = searchParams?.get('type_commands');
    const searchParam = searchParams?.get('search');

    if (filter && ['all', 'moderation', 'system', 'automation'].includes(filter)) {
      dispatch(setSelectedFilter(filter));
    }
    if (sort && ['new', 'old'].includes(sort)) {
      dispatch(setSortDir(sort));
    }
    if (status && ['new', 'processed', 'banned'].includes(status)) {
      dispatch(setStatusFilter(status));
    }
    if (botIdsParam) {
      const ids = botIdsParam.split(',').map(Number).filter(n => !isNaN(n));
      dispatch(setBotIds(ids.length > 0 ? ids : null));
    }
    if (channelIdsParam) {
      const ids = channelIdsParam.split(',').map(Number).filter(n => !isNaN(n));
      dispatch(setChannelIds(ids.length > 0 ? ids : null));
    }
    if (systemParam !== null) {
      dispatch(setSystem(systemParam === 'true'));
    }
    if (typeAutoRepliesParam !== null) {
      dispatch(setTypeAutoReplies(typeAutoRepliesParam === 'true'));
    }
    if (typeTriggersParam !== null) {
      dispatch(setTypeTriggers(typeTriggersParam === 'true'));
    }
    if (typeCommandsParam !== null) {
      dispatch(setTypeCommands(typeCommandsParam === 'true'));
    }
    if (searchParam !== null) {
      dispatch(setSearch(searchParam || null));
    }

    setInitialized(true);
  }, [searchParams, dispatch, initialized]);

  useEffect(() => {
    if (!initialized) return;

    const params = new URLSearchParams();
    
    if (selectedFilter && selectedFilter !== 'all') {
      params.set('filter', selectedFilter);
    }
    if (sortDir && sortDir !== 'new') {
      params.set('sort', sortDir);
    }
    if (statusFilter) {
      params.set('status', statusFilter);
    }
    if (botIds && botIds.length > 0) {
      params.set('bot_ids', botIds.join(','));
    }
    if (channelIds && channelIds.length > 0) {
      params.set('channel_ids', channelIds.join(','));
    }
    if (system !== null) {
      params.set('system', String(system));
    }
    if (typeAutoReplies !== null) {
      params.set('type_auto_replies', String(typeAutoReplies));
    }
    if (typeTriggers !== null) {
      params.set('type_triggers', String(typeTriggers));
    }
    if (typeCommands !== null) {
      params.set('type_commands', String(typeCommands));
    }
    if (search) {
      params.set('search', search);
    }

    const currentParams = new URLSearchParams(searchParams?.toString() || '');
    const newParamsString = params.toString();
    const currentParamsString = currentParams.toString();

    if (newParamsString !== currentParamsString) {
      const newUrl = newParamsString 
        ? `/${locale}/inbox?${newParamsString}`
        : `/${locale}/inbox`;
      
      router.replace(newUrl, { scroll: false });
    }
  }, [initialized, selectedFilter, sortDir, statusFilter, botIds, channelIds, system, typeAutoReplies, typeTriggers, typeCommands, search, locale, router, searchParams]);

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
        isReady={isUrlHydrated}
      />
      <InboxList
        type={selectedFilter as ListHeaderType}
        onHandlersReady={setSortHandlers}
        isReady={isUrlHydrated}
      />
    </div>
  )
}

export default InboxView;