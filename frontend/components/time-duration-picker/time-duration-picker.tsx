'use client';

import { useRef, useEffect, useCallback } from 'react';
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

  const formatValue = (val: number): string => {
    return val.toString().padStart(2, '0');
  };

  const clampDays = useCallback((val: number): number => {
    if (val < 0) return maxDays;
    if (val > maxDays) return 0;
    return val;
  }, [maxDays]);

  const clampHours = useCallback((val: number): number => {
    if (val < 0) return 23;
    if (val > 23) return 0;
    return val;
  }, []);

  const handleWheel = useCallback((e: WheelEvent, type: 'days' | 'hours') => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    
    if (type === 'days') {
      onDaysChange(clampDays(days + delta));
    } else {
      onHoursChange(clampHours(hours + delta));
    }
  }, [days, hours, onDaysChange, onHoursChange, clampDays, clampHours]);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'days' | 'hours') => {
    isDragging.current = type;
    startY.current = e.clientY;
    startValue.current = type === 'days' ? days : hours;
    document.body.style.userSelect = 'none';
  }, [days, hours]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
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
  }, [days, hours, onDaysChange, onHoursChange, clampDays, clampHours]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = null;
    document.body.style.userSelect = '';
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, type: 'days' | 'hours') => {
    isDragging.current = type;
    startY.current = e.touches[0].clientY;
    startValue.current = type === 'days' ? days : hours;
  }, [days, hours]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
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
  }, [days, hours, onDaysChange, onHoursChange, clampDays, clampHours]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = null;
  }, []);

  useEffect(() => {
    const daysEl = daysRef.current;
    const hoursEl = hoursRef.current;

    const handleDaysWheel = (e: WheelEvent) => handleWheel(e, 'days');
    const handleHoursWheel = (e: WheelEvent) => handleWheel(e, 'hours');

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
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  const prevDays = clampDays(days - 1);
  const nextDays = clampDays(days + 1);
  const prevHours = clampHours(hours - 1);
  const nextHours = clampHours(hours + 1);

  return (
    <div className={styles.container}>
      {/* Labels row */}
      <div className={styles.labelsRow}>
        <span className={styles.label}>дней</span>
        <span className={styles.label}>часов</span>
      </div>

      {/* Previous values row */}
      <div className={styles.valuesRow}>
        <span className={styles.inactiveValue}>{formatValue(prevDays)}</span>
        <span className={styles.inactiveValue}>{formatValue(prevHours)}</span>
      </div>

      {/* Active values row with blue background */}
      <div className={styles.activeRow}>
        <div
          ref={daysRef}
          className={styles.activeValueWrapper}
          onMouseDown={(e) => handleMouseDown(e, 'days')}
          onTouchStart={(e) => handleTouchStart(e, 'days')}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className={styles.activeValue}>{formatValue(days)}</span>
        </div>
        <div
          ref={hoursRef}
          className={styles.activeValueWrapper}
          onMouseDown={(e) => handleMouseDown(e, 'hours')}
          onTouchStart={(e) => handleTouchStart(e, 'hours')}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className={styles.activeValue}>{formatValue(hours)}</span>
        </div>
      </div>

      {/* Next values row */}
      <div className={styles.valuesRow}>
        <span className={styles.inactiveValue}>{formatValue(nextDays)}</span>
        <span className={styles.inactiveValue}>{formatValue(nextHours)}</span>
      </div>
    </div>
  );
}
