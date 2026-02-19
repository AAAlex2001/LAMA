import type { CalendarView } from '../store';
import { formatDateOnly } from './date-helpers';
import { MONTH_NAMES_GEN } from './constants';

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
}

export function getMonthLabel(date: Date): string {
  return `${MONTH_NAMES_GEN[date.getMonth()]} ${date.getFullYear()}`;
}

export function getRangeForView(view: CalendarView, date: Date) {
  if (view === 'week') {
    const ws = getWeekStart(date);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    const startDate = formatDateOnly(ws);
    const endDate = formatDateOnly(we);
    return { startDate, endDate, key: `${view}:${startDate}:${endDate}` };
  }
  if (view === 'month') {
    const startDate = formatDateOnly(new Date(date.getFullYear(), date.getMonth(), 1));
    const endDate = formatDateOnly(new Date(date.getFullYear(), date.getMonth() + 1, 0));
    return { startDate, endDate, key: `${view}:${startDate}:${endDate}` };
  }
  if (view === 'list') {
    const y = date.getFullYear();
    return { startDate: `${y}-01-01`, endDate: `${y}-12-31`, key: `${view}:${y}` };
  }
  const day = formatDateOnly(date);
  return { startDate: day, endDate: day, key: `${view}:${day}` };
}

export function getVisibleDayKeys(view: CalendarView, date: Date): string[] {
  if (view === 'week') {
    const ws = getWeekStart(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(ws.getDate() + i);
      return formatDateOnly(d);
    });
  }
  if (view === 'month') return getMonthDates(date).map(formatDateOnly);
  return [];
}
