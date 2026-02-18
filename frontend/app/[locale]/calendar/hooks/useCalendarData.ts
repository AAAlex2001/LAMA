import React from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setCurrentView,
  setListSortOrder,
  setListStatusFilter,
  setIsLoading,
  setItems,
  setSelectedDate,
  setSidebarDate,
  setListDateRange,
  clearListDateRange,
  setWeekItems,
  setMonthPostCounts,
  setCountsMonthAnchor,
  setCurrentRangeKey,
  setCurrentPage,
  setHasMore,
  setIsLoadingMore,
  setDayPageState,
  patchDayPageState,
} from '../store';
import type { CalendarView } from '../store';
import type { Draft, DraftListResponse } from '@/app/[locale]/create-post/store/types';
import { apiRequest } from '@/app/[locale]/create-post/store/thunks/api';
import {
  formatDateOnly,
  formatDayTitle,
  getMonthDates,
  getMonthLabel,
  getRangeForView,
  getVisibleDayKeys,
  isSameDay,
  mergeUniqueById,
} from '../utils/calendar-helpers';

function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function sortPosts(posts: Draft[]): Draft[] {
  return [...posts].sort((a, b) => {
    const aTime = new Date((a as any).scheduled_time || a.updated_at || a.created_at).getTime();
    const bTime = new Date((b as any).scheduled_time || b.updated_at || b.created_at).getTime();
    return aTime - bTime;
  });
}

export function useCalendarData() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.calendar);
  
  const {
    items, weekItems, isLoading, selectedDate: selectedDateStr, currentView,
    sidebarDate: sidebarDateStr,
    monthPostCounts, countsMonthAnchor: countsMonthAnchorStr, isLoadingMore, dayPageState,
    listRangeStart: listRangeStartStr, listRangeEnd: listRangeEndStr,
    listSortOrder, listStatusFilter,
  } = state;

  const stateRef = React.useRef(state);
  stateRef.current = state;
  const loadInFlight = React.useRef(false);
  const dayInFlight = React.useRef<Record<string, boolean>>({});
  const wasNearBottomRef = React.useRef<Record<'main' | 'window', boolean>>({ main: false, window: false });
  const prevScrollTopByTargetRef = React.useRef<Record<'main' | 'window', number>>({ main: 0, window: 0 });

  const selectedDate = parseDate(selectedDateStr);
  const sidebarDate = parseDate(sidebarDateStr);
  const countsMonthAnchor = parseDate(countsMonthAnchorStr);
  const listRangeStart = listRangeStartStr ? parseDate(listRangeStartStr) : null;
  const listRangeEnd = listRangeEndStr ? parseDate(listRangeEndStr) : null;

  React.useEffect(() => {
    dispatch(setCountsMonthAnchor(selectedDateStr));
  }, [selectedDateStr, dispatch]);

  async function loadListPage(page: number, append: boolean) {
    const s = stateRef.current;
    let startDate: string;
    let endDate: string;
    let key: string;

    if (s.currentView === 'list' && s.listRangeStart && s.listRangeEnd) {
      startDate = s.listRangeStart;
      endDate = s.listRangeEnd;
      key = `${startDate}_${endDate}`;
    } else {
      const range = getRangeForView(s.currentView, parseDate(s.selectedDate));
      startDate = range.startDate;
      endDate = range.endDate;
      key = range.key;
    }
    
    const params = new URLSearchParams({
      page: String(page),
      page_size: '30',
      start_date: `${startDate}T00:00:00`,
      end_date: `${endDate}T23:59:59`,
    });

    if (s.currentView === 'list') {
      if (s.listSortOrder) {
        params.set('sort_order', s.listSortOrder);
      }
      if (s.listStatusFilter) {
        params.set('status', s.listStatusFilter);
      }
    }

    const res = await apiRequest<DraftListResponse>(`/publications?${params}`);

    const currentItems = s.items;
    const nextItems = append ? mergeUniqueById(currentItems, res.items) : res.items;
    const hasGrowth = !append || nextItems.length > currentItems.length;

    // Save scroll position before state update to prevent jump
    let savedScrollTop = 0;
    let scrollEl: Element | null = null;
    if (append) {
      const mainNode = document.querySelector<HTMLElement>('main');
      scrollEl = mainNode && mainNode.scrollHeight > mainNode.clientHeight + 1
        ? mainNode
        : document.documentElement;
      savedScrollTop = scrollEl.scrollTop;
    }

    dispatch(setItems(nextItems));
    
    dispatch(setWeekItems({}));
    dispatch(setCurrentRangeKey(key));
    dispatch(setCurrentPage(page));
    dispatch(setHasMore(hasGrowth && res.items.length > 0));

    // Restore scroll position after React render
    if (append && scrollEl) {
      requestAnimationFrame(() => {
        scrollEl!.scrollTop = savedScrollTop;
      });
    }
  }

  async function loadGridDay(dateKey: string, page: number, append: boolean) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: '20',
      start_date: `${dateKey}T00:00:00`,
      end_date: `${dateKey}T23:59:59`,
    });

    const res = await apiRequest<DraftListResponse>(`/publications?${params}`);
    const current = stateRef.current.weekItems[dateKey] || [];
    const merged = append ? mergeUniqueById(current, res.items) : res.items;
    const hasGrowth = !append || merged.length > current.length;

    // Save column scroll position before state update
    let savedScrollTop = 0;
    let columnEl: Element | null = null;
    if (append) {
      const columns = document.querySelectorAll<HTMLElement>('[data-date-key]');
      columns.forEach(el => {
        if (el.getAttribute('data-date-key') === dateKey) {
          columnEl = el;
          savedScrollTop = el.scrollTop;
        }
      });
    }

    dispatch(setWeekItems({ ...stateRef.current.weekItems, [dateKey]: merged }));
    dispatch(patchDayPageState({
      dateKey,
      value: {
        page,
        hasMore: hasGrowth && res.items.length > 0,
        isLoading: false,
      },
    }));

    // Restore column scroll position
    if (append && columnEl) {
      requestAnimationFrame(() => {
        (columnEl as HTMLElement).scrollTop = savedScrollTop;
      });
    }
  }

  React.useEffect(() => {
    let active = true;
    dispatch(setIsLoading(true));

    async function init() {
      try {
        if (['week', 'month'].includes(currentView)) {
          const keys = getVisibleDayKeys(currentView, selectedDate);
          
          const initStates = Object.fromEntries(keys.map(k => [k, { page: 0, hasMore: true, isLoading: true }]));
          dispatch(setDayPageState(initStates));
          dispatch(setWeekItems(Object.fromEntries(keys.map(k => [k, []]))));
          dispatch(setItems([]));
          
          await Promise.all(keys.map(k => loadGridDay(k, 1, false)));
          if (active) dispatch(setHasMore(false));
        } else {
          await loadListPage(1, false);
        }
      } catch {
        if (active) dispatch(setHasMore(false));
      } finally {
        if (active) dispatch(setIsLoading(false));
      }
    }

    init();
    return () => { active = false; };
  }, [currentView, selectedDateStr, listRangeStartStr, listRangeEndStr, listSortOrder, listStatusFilter]); 

  React.useEffect(() => {
    if (currentView !== 'week') {
      dispatch(setMonthPostCounts({}));
      return;
    }
    
    let active = true;
    
    async function fetchCounts() {
      const year = countsMonthAnchor.getFullYear();
      const month = countsMonthAnchor.getMonth();
      const params = new URLSearchParams({
        page: '1',
        page_size: '100', 
        start_date: `${formatDateOnly(new Date(year, month, 1))}T00:00:00`,
        end_date: `${formatDateOnly(new Date(year, month + 1, 0))}T23:59:59`,
      });

      try {
        const res = await apiRequest<DraftListResponse>(`/publications?${params}`);
        const counts: Record<string, number> = {};
        
        res.items.forEach(p => {
          const d = new Date((p as any).scheduled_time || p.updated_at || p.created_at);
          if (!isNaN(d.getTime())) counts[formatDateOnly(d)] = (counts[formatDateOnly(d)] || 0) + 1;
        });

        if (active) dispatch(setMonthPostCounts(counts));
      } catch {}
    }

    fetchCounts();
    return () => { active = false; };
  }, [currentView, countsMonthAnchorStr]);

  function handleLoadMore() {
    const s = stateRef.current;
    if (['week', 'month'].includes(s.currentView)) return;
    if (s.isLoading || s.isLoadingMore || !s.hasMore || loadInFlight.current) return;

    loadInFlight.current = true;
    dispatch(setIsLoadingMore(true));

    loadListPage(s.currentPage + 1, true).finally(() => {
      loadInFlight.current = false;
      dispatch(setIsLoadingMore(false));
    });
  }

  function handleLoadMoreDay(dateKey: string) {
    if (dayInFlight.current[dateKey]) return;
    const s = stateRef.current.dayPageState[dateKey];
    if (!s || s.isLoading || !s.hasMore) return;

    dayInFlight.current[dateKey] = true;
    dispatch(patchDayPageState({ dateKey, value: { ...s, isLoading: true } }));

    loadGridDay(dateKey, s.page + 1, true).finally(() => {
      dayInFlight.current[dateKey] = false;
    });
  }

  React.useEffect(() => {
    if (['week', 'month'].includes(currentView)) return;

    const mainNode = document.querySelector<HTMLElement>('main');
    if (!mainNode) return;

    const BOTTOM_THRESHOLD = 12;
    const REARM_DISTANCE = 72;

    const getMetrics = () => {
      const { scrollHeight, scrollTop, clientHeight } = mainNode;
      return { scrollHeight, scrollTop, clientHeight };
    };

    const initTarget = () => {
      const initial = getMetrics();
      prevScrollTopByTargetRef.current['main'] = initial.scrollTop;
      wasNearBottomRef.current['main'] =
        initial.scrollHeight - initial.scrollTop <= initial.clientHeight + BOTTOM_THRESHOLD;

      if (initial.scrollHeight <= initial.clientHeight + BOTTOM_THRESHOLD) {
        handleLoadMore();
      }
    };

    const onScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = getMetrics();
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      const nearBottom = distanceToBottom <= BOTTOM_THRESHOLD;
      const prevTop = prevScrollTopByTargetRef.current['main'];
      const scrollingDown = scrollTop > prevTop;
      const wasNearBottom = wasNearBottomRef.current['main'];

      prevScrollTopByTargetRef.current['main'] = scrollTop;

      if (distanceToBottom > REARM_DISTANCE) {
        wasNearBottomRef.current['main'] = false;
      }

      if (nearBottom && !wasNearBottom && scrollingDown) {
        wasNearBottomRef.current['main'] = true;
        handleLoadMore();
      }
    };

    initTarget();
    mainNode.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      mainNode.removeEventListener('scroll', onScroll);
    };
  }, [currentView]);

  function updateDate(delta: number, unit: 'day' | 'week' | 'month' | 'year') {
    const d = new Date(selectedDate);
    if (unit === 'day') d.setDate(d.getDate() + delta);
    if (unit === 'week') d.setDate(d.getDate() + delta * 7);
    if (unit === 'month') d.setMonth(d.getMonth() + delta);
    if (unit === 'year') d.setFullYear(d.getFullYear() + delta);
    dispatch(setSelectedDate(formatDateOnly(d)));
  }

  const sortedPosts = sortPosts(items);
  const mobilePosts = ['week', 'month'].includes(currentView) 
    ? sortPosts(weekItems[sidebarDateStr] || []) 
    : sortedPosts;

  const sidebarPosts = ['week', 'month'].includes(currentView)
    ? sortPosts(weekItems[sidebarDateStr] || [])
    : sortedPosts;

  const currentMonthCounts = Object.entries(weekItems).reduce((acc, [k, v]) => ({
    ...acc, [k]: v.length
  }), {} as Record<string, number>);

  const dayLoadingMap = Object.fromEntries(
    Object.entries(dayPageState).map(([k, v]) => [k, v.isLoading])
  );

  return {
    ...state,
    selectedDate,
    sidebarDate,
    listRangeStart,
    listRangeEnd,
    sortedPosts,
    sidebarPosts,
    mobilePosts,
    monthDates: getMonthDates(selectedDate),
    isGridView: ['week', 'month'].includes(currentView),
    isTodaySelected: isSameDay(selectedDate, new Date()),
    gridPostCounts: currentView === 'month' ? currentMonthCounts : { ...monthPostCounts, ...currentMonthCounts },
    mobileGridTitle: currentView === 'month' ? getMonthLabel(selectedDate) : formatDayTitle(sidebarDate),
    listTitle: String(selectedDate.getFullYear()),
    dayLoadingMap,
    isLoadingMore,
    
    changeDate: (d: Date) => dispatch(setSelectedDate(formatDateOnly(d))),
    changeSidebarDate: (d: Date) => dispatch(setSidebarDate(formatDateOnly(d))),
    setListDateRange: (start: Date, end: Date) =>
      dispatch(setListDateRange({ start: formatDateOnly(start), end: formatDateOnly(end) })),
    clearListDateRange: () => dispatch(clearListDateRange()),
    
    handlePrevDay: () => {
      if (currentView === 'week') updateDate(-1, 'week');
      else if (currentView === 'month') updateDate(-1, 'month');
      else if (currentView === 'list') updateDate(-1, 'year');
      else updateDate(-1, 'day');
    },
    
    handleNextDay: () => {
      if (currentView === 'week') updateDate(1, 'week');
      else if (currentView === 'month') updateDate(1, 'month');
      else if (currentView === 'list') updateDate(1, 'year');
      else updateDate(1, 'day');
    },
    
    handleViewChange: (v: CalendarView) => dispatch(setCurrentView(v)),
    setListSortOrder: (order: 'asc' | 'desc' | null) => dispatch(setListSortOrder(order)),
    setListStatusFilter: (status: string | null) => dispatch(setListStatusFilter(status)),
    handleLoadMore,
    handleLoadMoreDay,
    setCountsMonthAnchor: (d: Date) => dispatch(setCountsMonthAnchor(formatDateOnly(d))),
  };
}
