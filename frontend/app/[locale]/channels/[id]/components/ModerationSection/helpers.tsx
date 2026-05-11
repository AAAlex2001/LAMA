import { FC } from 'react';

export const ChevronIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} дн`);
  if (hours > 0) parts.push(`${hours} ч`);
  if (mins > 0) parts.push(`${mins} мин`);
  return parts.join(' ') || '0 мин';
}

export function splitColumns<T>(items: T[]): { left: T[]; right: T[] } {
  return {
    left: items.filter((_, i) => i % 2 === 0),
    right: items.filter((_, i) => i % 2 === 1),
  };
}

export function minutesToParts(minutes: number) {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return { days, hours, mins };
}

export function partsToMinutes(days: number, hours: number, mins: number) {
  return days * 1440 + hours * 60 + mins;
}
