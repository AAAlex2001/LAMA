import type { Draft } from '@/app/[locale]/create-post/store/types';
import type { MediaFile } from '@/components/media-preview';
import type { CalendarView } from '../store';

const DAY_NAMES_FULL: Record<number, string> = {
  0: 'воскресенье',
  1: 'понедельник',
  2: 'вторник',
  3: 'среда',
  4: 'четверг',
  5: 'пятница',
  6: 'суббота',
};

export const MONTH_NAMES_GEN: string[] = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export const DAY_LIST_PAGE_SIZE = 30;
export const GRID_DAY_PAGE_SIZE = 20;

export type DayPageState = {
  page: number;
  hasMore: boolean;
  isLoading: boolean;
};

export function formatDayTitle(date: Date): string {
  const day = date.getDate();
  const month = MONTH_NAMES_GEN[date.getMonth()];
  const weekDay = DAY_NAMES_FULL[date.getDay()];
  return `${day} ${month}, ${weekDay}`;
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getPreviewText(post: Draft): string {
  const html =
    post.formatted_content?.html ||
    post.formatted_content?.text ||
    post.text_content ||
    '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export function getMediaType(url: string): 'image' | 'video' | 'document' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'document';
}

export function draftToMediaFiles(draft: Draft): MediaFile[] {
  if (!draft.media_urls?.length) return [];
  return draft.media_urls.map((url, index) => ({
    id: `calendar-media-${draft.id}-${index}`,
    url,
    type: getMediaType(url),
    blur: draft.media_blur?.[index] ?? false,
    thumbnail_url: draft.media_thumbnail_urls?.[index] ?? null,
    telegram_file_id: draft.media_file_ids?.[index] ?? null,
  }));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDateOnly(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: Date[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    result.push(new Date(year, month, day));
  }
  return result;
}

export function getMonthLabel(date: Date): string {
  return `${MONTH_NAMES_GEN[date.getMonth()]} ${date.getFullYear()}`;
}

export function getRangeForView(view: CalendarView, date: Date): { startDate: string; endDate: string; key: string } {
  if (view === 'week') {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startDate = formatDateOnly(weekStart);
    const endDate = formatDateOnly(weekEnd);
    return { startDate, endDate, key: `${view}:${startDate}:${endDate}` };
  }

  if (view === 'month') {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startDate = formatDateOnly(monthStart);
    const endDate = formatDateOnly(monthEnd);
    return { startDate, endDate, key: `${view}:${startDate}:${endDate}` };
  }

  if (view === 'list') {
    const year = date.getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return { startDate, endDate, key: `${view}:${year}` };
  }

  const day = formatDateOnly(date);
  return { startDate: day, endDate: day, key: `${view}:${day}` };
}

export function getVisibleDayKeys(view: CalendarView, date: Date): string[] {
  if (view === 'week') {
    const weekStart = getWeekStart(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return formatDateOnly(d);
    });
  }

  if (view === 'month') {
    return getMonthDates(date).map((d) => formatDateOnly(d));
  }

  return [];
}

export function mergeUniqueById(existing: Draft[], incoming: Draft[]): Draft[] {
  const seen = new Set<number>();
  const result: Draft[] = [];

  for (const post of existing) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    result.push(post);
  }

  for (const post of incoming) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    result.push(post);
  }

  return result;
}
