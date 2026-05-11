'use client';

import React from 'react';
import { CalendarIcon } from '@/components/icons';
import DatePicker from '@/components/date-picker/date-picker';
import { Button } from '@/components/new-button';
import styles from './date-range-picker.module.scss';

export type DateRange = { start: Date; end: Date };

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  postCounts?: Record<string, number>;
  onMonthChange?: (date: Date) => void;
  emptyLabel?: string;
  resetText?: string;
}

function formatLabel(range: DateRange | null, emptyLabel: string): string {
  if (!range) return emptyLabel;
  const fmt = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };
  if (range.start.getTime() === range.end.getTime()) return fmt(range.start);
  return `${fmt(range.start)} — ${fmt(range.end)}`;
}

export default function DateRangePicker({
  value,
  onChange,
  postCounts,
  onMonthChange,
  emptyLabel = 'За весь период',
  resetText = 'Сбросить всё',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draftStart, setDraftStart] = React.useState<Date | null>(value?.start || null);
  const [draftEnd, setDraftEnd] = React.useState<Date | null>(value?.end || null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setDraftStart(value?.start || null);
    setDraftEnd(value?.end || null);
  }, [value?.start?.getTime(), value?.end?.getTime()]);

  React.useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open]);

  let selectedDateKeys: string[] = [];
  if (!draftStart || !draftEnd) {
    if (draftStart) {
      selectedDateKeys = [
        `${draftStart.getFullYear()}-${String(draftStart.getMonth() + 1).padStart(2, '0')}-${String(draftStart.getDate()).padStart(2, '0')}`,
      ];
    }
  } else {
    const start = draftStart <= draftEnd ? draftStart : draftEnd;
    const end = draftStart <= draftEnd ? draftEnd : draftStart;
    const keys: string[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endAt = new Date(end);
    endAt.setHours(0, 0, 0, 0);

    while (cursor <= endAt) {
      keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
      cursor.setDate(cursor.getDate() + 1);
    }

    selectedDateKeys = keys;
  }

  function handleDatePick(date: Date) {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(date);
      setDraftEnd(null);
      return;
    }

    if (date.getTime() >= draftStart.getTime()) {
      setDraftEnd(date);
      onChange({ start: draftStart, end: date });
    } else {
      setDraftEnd(draftStart);
      setDraftStart(date);
      onChange({ start: date, end: draftStart });
    }
  }

  const [fallbackDate] = React.useState(() => new Date());
  const pickerValue = draftEnd || draftStart || value?.start || fallbackDate;

  return (
    <div className={styles.root} ref={rootRef}>
      <button type="button" className={styles.trigger} onClick={() => setOpen((v) => !v)}>
        <span className={styles.triggerText}>{formatLabel(value, emptyLabel)}</span>
        <span className={styles.triggerIcon}>
          <CalendarIcon width={24} height={24} color="#1E1E1E" />
        </span>
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <DatePicker
              value={pickerValue}
              onChange={handleDatePick}
              onMonthChange={onMonthChange}
              locale="ru"
              minDate={null}
              selectedDateKeys={selectedDateKeys}
              rangeSelection
              postCounts={postCounts}
              className={styles.calendar}
            />

            <Button
              style={{ width: '100%' }}
              onClick={() => {
                setDraftStart(null);
                setDraftEnd(null);
                onChange(null);
                setOpen(false);
              }}
              className={styles.resetBtnWrap}
            >
              {resetText}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
