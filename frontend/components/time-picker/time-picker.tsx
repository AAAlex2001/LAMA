'use client';

import { useEffect } from 'react';
import { WheelPicker } from '@/components/wheel-picker';
import styles from './time-picker.module.scss';

interface TimePickerProps {
  hours: number;
  minutes: number;
  onHoursChange: (hours: number) => void;
  onMinutesChange: (minutes: number) => void;
  selectedDate?: Date | null;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function TimePicker({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  selectedDate,
}: TimePickerProps) {
  const now = new Date();
  const isToday = selectedDate ? isSameDay(selectedDate, now) : false;

  const minHours = isToday ? now.getHours() : 0;
  const minMinutes = isToday && hours === now.getHours() ? now.getMinutes() : 0;

  useEffect(() => {
    if (hours < minHours) onHoursChange(minHours);
  }, [hours, minHours, onHoursChange]);

  useEffect(() => {
    if (minutes < minMinutes) onMinutesChange(minMinutes);
  }, [minutes, minMinutes, onMinutesChange]);

  return (
    <div className={styles.container}>
      <div className={styles.columnsWrapper}>
        <WheelPicker
          value={hours}
          onChange={onHoursChange}
          min={minHours}
          max={23}
        />
        <div className={styles.separatorColumn}>
          <span className={styles.separator}>&nbsp;</span>
          <span className={styles.activeSeparator}>:</span>
          <span className={styles.separator}>:</span>
        </div>
        <WheelPicker
          value={minutes}
          onChange={onMinutesChange}
          min={minMinutes}
          max={59}
        />
      </div>
    </div>
  );
}
