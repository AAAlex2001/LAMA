'use client';

import { useEffect, useMemo, useState } from 'react';
import { useChannelsQuery } from '@/store/channels';
import { useTagsQuery } from '@/store/tags/queries';
import { useDayCountsQuery, type DayCountItem, type DayCountsResponse } from '@/store/publications/queries';
import {
  useAppDispatch,
  useAppSelector,
  type RootState,
  type DayStatusCount,
  selectSortedPosts,
  selectMobilePosts,
  selectDayLoadingMap,
  selectDayHasMoreMap,
  selectSelectedDateObj,
  selectSidebarDateObj,
  selectListRangeStartObj,
  selectListRangeEndObj,
  selectIsGridView,
  selectSidebarPosts,
} from '../store';
import { fetchCalendarData } from '../store/thunks';
import { parseDate, formatDateOnly } from '../utils/calendar-helpers';

function parseDayCounts(data: DayCountsResponse | undefined): {
  counts: Record<string, number>;
  statusCounts: Record<string, DayStatusCount>;
} {
  const counts: Record<string, number> = {};
  const statusCounts: Record<string, DayStatusCount> = {};
  if (!data) return { counts, statusCounts };

  if (Array.isArray(data.counts)) {
    for (const item of data.counts as DayCountItem[]) {
      if (!item?.date) continue;
      counts[item.date] = item.count || 0;
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
  return { counts, statusCounts };
}

/**
 * Server data календаря: списки/grid через Redux thunks (см. fetchCalendarData),
 * счётчики и status по месяцу — через TanStack Query.
 * UI state из Redux.
 */
export function useCalendarPageData() {
  const dispatch = useAppDispatch();

  const calendar = useAppSelector((state: RootState) => state.calendar);
  const selectedDate = useAppSelector(selectSelectedDateObj);
  const sidebarDate = useAppSelector(selectSidebarDateObj);
  const listRangeStart = useAppSelector(selectListRangeStartObj);
  const listRangeEnd = useAppSelector(selectListRangeEndObj);

  const sortedPosts = useAppSelector(selectSortedPosts);
  const mobilePosts = useAppSelector(selectMobilePosts);
  const dayLoadingMap = useAppSelector(selectDayLoadingMap);
  const dayHasMoreMap = useAppSelector(selectDayHasMoreMap);
  const isGridView = useAppSelector(selectIsGridView);
  const sidebarPosts = useAppSelector(selectSidebarPosts);

  const { data: allTags } = useTagsQuery();
  const { data: channelsData } = useChannelsQuery();
  const allChannels = channelsData?.items;

  // Counts и status по месяцу — через TQ (раньше fetchDayCounts thunk + дублирующий кэш)
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const monthAnchor = parseDate(calendar.countsMonthAnchor);
  const monthStart = formatDateOnly(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1));
  const monthEnd = formatDateOnly(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0));
  const dayCountsQuery = useDayCountsQuery({ startDate: monthStart, endDate: monthEnd, tz: userTz });
  // Стабилизируем reference: parseDayCounts создаёт новые объекты, что пробрасывалось
  // в DatePicker/Header через props и могло сбрасывать IntersectionObserver state.
  const { gridPostCounts, monthStatusCounts } = useMemo(() => {
    const { counts, statusCounts } = parseDayCounts(dayCountsQuery.data);
    return { gridPostCounts: counts, monthStatusCounts: statusCounts };
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

  // Запрос grid/list данных при смене view/диапазона/фильтров
  useEffect(() => {
    dispatch(fetchCalendarData());
  }, [
    dispatch,
    calendar.currentView,
    calendar.selectedDate,
    calendar.currentView === 'month' ? calendar.sidebarDate : null,
    calendar.listRangeStart,
    calendar.listRangeEnd,
    calendar.listSortOrder,
    calendar.listStatusFilter,
  ]);

  return {
    calendar,
    selectedDate,
    sidebarDate,
    listRangeStart,
    listRangeEnd,
    sortedPosts,
    mobilePosts,
    sidebarPosts,
    gridPostCounts,
    monthStatusCounts,
    dayLoadingMap,
    dayHasMoreMap,
    isGridView,
    allTags,
    allChannels,
    showMobile,
    setShowMobile,
    mobileActiveFilters,
    setMobileActiveFilters,
  };
}
