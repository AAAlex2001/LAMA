'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Draft } from '@/types/post';
import { useChannelsQuery } from '@/store/channels';
import { useTagsQuery } from '@/store/tags/queries';
import {
  useDayCountsQuery,
  type DayCountItem,
  type DayCountsResponse,
} from '@/store/publications/queries';
import {
  useCalendarDataQuery,
  useFetchMoreDayPostsMutation,
  useFetchMoreListPostsMutation,
  calendarKeys,
  type CalendarData,
} from '@/store/calendar/queries';
import {
  useAppSelector,
  type RootState,
  type DayStatusCount,
  selectSelectedDateObj,
  selectSidebarDateObj,
  selectListRangeStartObj,
  selectListRangeEndObj,
  selectIsGridView,
} from '../store';
import { parseDate, formatDateOnly } from '../utils/calendar-helpers';
import { sortPostsByTime } from '../utils/post-helpers';

function parseDayCounts(data: DayCountsResponse | undefined): {
  counts: Record<string, number>;
  adsCounts: Record<string, number>;
  statusCounts: Record<string, DayStatusCount>;
} {
  const counts: Record<string, number> = {};
  const adsCounts: Record<string, number> = {};
  const statusCounts: Record<string, DayStatusCount> = {};
  if (!data) return { counts, adsCounts, statusCounts };

  if (Array.isArray(data.counts)) {
    for (const item of data.counts as DayCountItem[]) {
      if (!item?.date) continue;
      counts[item.date] = item.count || 0;
      if (item.ads) adsCounts[item.date] = item.ads;
      statusCounts[item.date] = {
        published: item.published ?? 0,
        scheduled: item.scheduled ?? 0,
        draft: item.draft ?? 0,
        bot_messages: item.bot_messages ?? 0,
      };
    }
  } else {
    Object.assign(counts, data.counts);
  }
  return { counts, adsCounts, statusCounts };
}

interface DerivedCalendarData {
  items: Draft[];
  weekItems: Record<string, Draft[]>;
  dayHasMoreMap: Record<string, boolean>;
  dayPageMap: Record<string, number>;
  hasMore: boolean;
  listTotal: number;
  listPage: number;
}

function deriveFromQueryData(data: CalendarData | undefined): DerivedCalendarData {
  if (!data) {
    return {
      items: [],
      weekItems: {},
      dayHasMoreMap: {},
      dayPageMap: {},
      hasMore: false,
      listTotal: 0,
      listPage: 1,
    };
  }
  if (data.type === 'grid') {
    const weekItems: Record<string, Draft[]> = {};
    const dayHasMoreMap: Record<string, boolean> = {};
    const dayPageMap: Record<string, number> = {};
    for (const r of data.results) {
      weekItems[r.dateKey] = r.items;
      dayHasMoreMap[r.dateKey] = r.hasMore;
      dayPageMap[r.dateKey] = r.page;
    }
    return {
      items: [],
      weekItems,
      dayHasMoreMap,
      dayPageMap,
      hasMore: false,
      listTotal: 0,
      listPage: 1,
    };
  }
  return {
    items: data.items,
    weekItems: {},
    dayHasMoreMap: {},
    dayPageMap: {},
    hasMore: data.hasMore,
    listTotal: data.total,
    listPage: data.page,
  };
}

/**
 * Server data календаря: списки/grid через TanStack Query (см. useCalendarDataQuery),
 * счётчики и status по месяцу — через useDayCountsQuery.
 * UI state из Redux.
 */
export function useCalendarPageData() {
  const calendar = useAppSelector((state: RootState) => state.calendar);
  const selectedDate = useAppSelector(selectSelectedDateObj);
  const sidebarDate = useAppSelector(selectSidebarDateObj);
  const listRangeStart = useAppSelector(selectListRangeStartObj);
  const listRangeEnd = useAppSelector(selectListRangeEndObj);
  const isGridView = useAppSelector(selectIsGridView);

  const queryParams = {
    view: calendar.currentView,
    selectedDate: calendar.selectedDate,
    sidebarDate: calendar.sidebarDate,
    listRangeStart: calendar.listRangeStart,
    listRangeEnd: calendar.listRangeEnd,
    listSortOrder: calendar.listSortOrder,
    listStatusFilter: calendar.listStatusFilter,
  };

  const calendarQuery = useCalendarDataQuery(queryParams);
  const fetchMoreDay = useFetchMoreDayPostsMutation();
  const fetchMoreList = useFetchMoreListPostsMutation();
  const queryKey = useMemo(() => calendarKeys.data(queryParams), [
    queryParams.view,
    queryParams.selectedDate,
    queryParams.sidebarDate,
    queryParams.listRangeStart,
    queryParams.listRangeEnd,
    queryParams.listSortOrder,
    queryParams.listStatusFilter,
  ]);

  const derived = useMemo(() => deriveFromQueryData(calendarQuery.data), [calendarQuery.data]);

  const dayLoadingMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (fetchMoreDay.isPending && fetchMoreDay.variables) {
      map[fetchMoreDay.variables.dateKey] = true;
    }
    return map;
  }, [fetchMoreDay.isPending, fetchMoreDay.variables]);

  const sortedPosts = useMemo(() => {
    if (calendar.currentView === 'list') {
      return sortPostsByTime(derived.items, calendar.listSortOrder === 'asc' ? 'asc' : 'desc');
    }
    return sortPostsByTime(derived.items, 'desc');
  }, [derived.items, calendar.currentView, calendar.listSortOrder]);

  const sidebarPosts = useMemo(() => {
    if (calendar.currentView === 'week' || calendar.currentView === 'month') {
      return sortPostsByTime(derived.weekItems[calendar.sidebarDate] || []);
    }
    return sortPostsByTime(derived.items);
  }, [calendar.currentView, calendar.sidebarDate, derived.weekItems, derived.items]);

  const mobilePosts = useMemo(() => {
    if (calendar.currentView === 'week' || calendar.currentView === 'month') {
      return sortPostsByTime(derived.weekItems[calendar.sidebarDate] || []);
    }
    return sortedPosts;
  }, [calendar.currentView, calendar.sidebarDate, derived.weekItems, sortedPosts]);

  const { data: allTags } = useTagsQuery();
  const { data: channelsData } = useChannelsQuery();
  const allChannels = channelsData?.items;

  // Counts и status по месяцу — через TQ
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const monthAnchor = parseDate(calendar.countsMonthAnchor);
  const monthStart = formatDateOnly(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1));
  const monthEnd = formatDateOnly(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0));
  const dayCountsQuery = useDayCountsQuery({ startDate: monthStart, endDate: monthEnd, tz: userTz });
  // Стабилизируем reference: parseDayCounts создаёт новые объекты, что пробрасывалось
  // в DatePicker/Header через props и могло сбрасывать IntersectionObserver state.
  const { gridPostCounts, gridAdsCounts, monthStatusCounts } = useMemo(() => {
    const { counts, adsCounts, statusCounts } = parseDayCounts(dayCountsQuery.data);
    return { gridPostCounts: counts, gridAdsCounts: adsCounts, monthStatusCounts: statusCounts };
  }, [dayCountsQuery.data]);

  // Mobile UI state
  const [showMobile, setShowMobile] = useState(false);
  const [mobileActiveFilters, setMobileActiveFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    setMobileActiveFilters({});
  }, [calendar.currentView]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 0;
  }, [calendar.currentView, calendar.selectedDate]);

  return {
    calendar,
    selectedDate,
    sidebarDate,
    listRangeStart,
    listRangeEnd,
    sortedPosts,
    mobilePosts,
    sidebarPosts,
    weekItems: derived.weekItems,
    isLoading: calendarQuery.isLoading,
    isLoadingMore: fetchMoreList.isPending,
    hasMore: derived.hasMore,
    listTotal: derived.listTotal,
    listPage: derived.listPage,
    dayPageMap: derived.dayPageMap,
    gridPostCounts,
    gridAdsCounts,
    monthStatusCounts,
    dayLoadingMap,
    dayHasMoreMap: derived.dayHasMoreMap,
    isGridView,
    allTags,
    allChannels,
    showMobile,
    setShowMobile,
    mobileActiveFilters,
    setMobileActiveFilters,
    queryKey,
    fetchMoreDay,
    fetchMoreList,
  };
}
