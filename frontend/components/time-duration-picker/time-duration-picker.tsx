'use client';

import { useRef, useEffect, useState } from 'react';
import styles from './time-duration-picker.module.scss';

interface TimeDurationPickerProps {
  days: number;
  hours: number;
  onDaysChange: (value: number) => void;
  onHoursChange: (value: number) => void;
  maxDays?: number;
}

export default function TimeDurationPicker({
  days,
  hours,
  onDaysChange,
  onHoursChange,
  maxDays = 365,
}: TimeDurationPickerProps) {
  const daysRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  
  const isDragging = useRef<'days' | 'hours' | null>(null);
  const startY = useRef(0);
  const startValue = useRef(0);

  // Input editing state
  const [isEditingDays, setIsEditingDays] = useState(false);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [inputDays, setInputDays] = useState('');
  const [inputHours, setInputHours] = useState('');

  const formatValue = (val: number): string => {
    return val.toString().padStart(2, '0');
  };

  const clampDays = (val: number): number => {
    if (val < 0) return maxDays;
    if (val > maxDays) return 0;
    return val;
  };

  const clampHours = (val: number): number => {
    if (val < 0) return 23;
    if (val > 23) return 0;
    return val;
  };

  // Days input handlers
  const handleDaysClick = () => {
    setInputDays(formatValue(days));
    setIsEditingDays(true);
  };

  const handleDaysInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setInputDays(value);
  };

  const handleDaysInputBlur = () => {
    const parsed = parseInt(inputDays, 10);
    if (!isNaN(parsed)) {
      onDaysChange(Math.min(Math.max(0, parsed), maxDays));
    }
    setIsEditingDays(false);
  };

  const handleDaysInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDaysInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditingDays(false);
    }
  };

  // Hours input handlers
  const handleHoursClick = () => {
    setInputHours(formatValue(hours));
    setIsEditingHours(true);
  };

  const handleHoursInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputHours(value);
  };

  const handleHoursInputBlur = () => {
    const parsed = parseInt(inputHours, 10);
    if (!isNaN(parsed)) {
      onHoursChange(Math.min(Math.max(0, parsed), 23));
    }
    setIsEditingHours(false);
  };

  const handleHoursInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleHoursInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditingHours(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'days' | 'hours') => {
    isDragging.current = type;
    startY.current = e.clientY;
    startValue.current = type === 'days' ? days : hours;
    document.body.style.userSelect = 'none';
  };

  const handleTouchStart = (e: React.TouchEvent, type: 'days' | 'hours') => {
    isDragging.current = type;
    startY.current = e.touches[0].clientY;
    startValue.current = type === 'days' ? days : hours;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const deltaY = startY.current - e.touches[0].clientY;
    const steps = Math.round(deltaY / 24);
    
    if (isDragging.current === 'days') {
      const newValue = clampDays(startValue.current + steps);
      if (newValue !== days) {
        onDaysChange(newValue);
      }
    } else {
      const newValue = clampHours(startValue.current + steps);
      if (newValue !== hours) {
        onHoursChange(newValue);
      }
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = null;
  };

  useEffect(() => {
    const daysEl = daysRef.current;
    const hoursEl = hoursRef.current;

    const handleDaysWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      onDaysChange(clampDays(days + delta));
    };

    const handleHoursWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      onHoursChange(clampHours(hours + delta));
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaY = startY.current - e.clientY;
      const steps = Math.round(deltaY / 24);

      if (isDragging.current === 'days') {
        const newValue = clampDays(startValue.current + steps);
        if (newValue !== days) {
          onDaysChange(newValue);
        }
      } else {
        const newValue = clampHours(startValue.current + steps);
        if (newValue !== hours) {
          onHoursChange(newValue);
        }
      }
    };

    const handleMouseUp = () => {
      isDragging.current = null;
      document.body.style.userSelect = '';
    };

    daysEl?.addEventListener('wheel', handleDaysWheel, { passive: false });
    hoursEl?.addEventListener('wheel', handleHoursWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      daysEl?.removeEventListener('wheel', handleDaysWheel);
      hoursEl?.removeEventListener('wheel', handleHoursWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [days, hours, onDaysChange, onHoursChange, maxDays]);

  const prevDays = clampDays(days - 1);
  const nextDays = clampDays(days + 1);
  const prevHours = clampHours(hours - 1);
  const nextHours = clampHours(hours + 1);

  return (
    <div className={styles.container}>
      {/* Labels row */}
      <div className={styles.labelsRow}>
        <span className={styles.label}>дней</span>
        <span className={styles.labelSpacer} />
        <span className={styles.label}>часов</span>
      </div>

      <div className={styles.columnsWrapper}>
        {/* Days column */}
        <div
          ref={daysRef}
          className={styles.column}
          onMouseDown={(e) => handleMouseDown(e, 'days')}
          onTouchStart={(e) => handleTouchStart(e, 'days')}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className={styles.inactiveValue}>{formatValue(prevDays)}</span>
          
          <div className={styles.activeValue}>
            {isEditingDays ? (
              <input
                type="text"
                value={inputDays}
                onChange={handleDaysInputChange}
                onBlur={handleDaysInputBlur}
                onKeyDown={handleDaysInputKeyDown}
                className={styles.input}
                autoFocus
                maxLength={3}
              />
            ) : (
              <span onClick={handleDaysClick}>{formatValue(days)}</span>
            )}
          </div>
          
          <span className={styles.inactiveValue}>{formatValue(nextDays)}</span>
        </div>

        {/* Separator column */}
        <div className={styles.separatorColumn}>
          <span className={styles.separator}>:</span>
          <span className={styles.activeSeparator}>:</span>
          <span className={styles.separator}>:</span>
        </div>

        {/* Hours column */}
        <div
          ref={hoursRef}
          className={styles.column}
          onMouseDown={(e) => handleMouseDown(e, 'hours')}
          onTouchStart={(e) => handleTouchStart(e, 'hours')}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className={styles.inactiveValue}>{formatValue(prevHours)}</span>
          
          <div className={styles.activeValue}>
            {isEditingHours ? (
              <input
                type="text"
                value={inputHours}
                onChange={handleHoursInputChange}
                onBlur={handleHoursInputBlur}
                onKeyDown={handleHoursInputKeyDown}
                className={styles.input}
                autoFocus
                maxLength={2}
              />
            ) : (
              <span onClick={handleHoursClick}>{formatValue(hours)}</span>
            )}
          </div>
          
          <span className={styles.inactiveValue}>{formatValue(nextHours)}</span>
        </div>
      </div>
    </div>
  );
}
