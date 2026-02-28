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
  notShowQuickTimes?: boolean;
  notShowHint?: boolean;
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
  notShowQuickTimes = false,
  notShowHint = false,
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

  const quickTimes = [
    { label: '20:00', hours: 20, minutes: 0 },
    { label: '15:00', hours: 15, minutes: 0 },
    { label: '13:30', hours: 13, minutes: 30 },
  ];

  const handleQuickTime = (h: number, m: number) => {
    onHoursChange(h);
    onMinutesChange(m);
  };

  return (
    <div className={styles.container}>
      <div className={styles.dateTimeSection}>
        <div className={styles.timePickerWrapper}>
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
      </div>
      {!notShowQuickTimes && 
        <div className={styles.quickTimeButtons}>
          <div className={styles.quickTimeButtonsRow}>
            {quickTimes.map((time) => (
              <button
                key={time.label}
                className={styles.quickTimeButton}
                onClick={() => handleQuickTime(time.hours, time.minutes)}
              >
                {time.label}
              </button>
            ))}
          </div>
        </div>
      }
      {!notShowHint && <div className={styles.hint}>Расширенные настройки доступны в меню</div>}
    </div>
  );
}
