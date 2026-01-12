'use client';

import { useRef, useEffect, useCallback } from 'react';
import styles from './drum-picker.module.scss';

interface DrumPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}

export default function DrumPicker({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: DrumPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const formatValue = (val: number): string => {
    return val.toString().padStart(2, '0');
  };

  const clampValue = useCallback((val: number): number => {
    if (val < min) return max;
    if (val > max) return min;
    return val;
  }, [min, max]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    onChange(clampValue(value + delta));
  }, [value, onChange, clampValue]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    document.body.style.userSelect = 'none';
  }, [value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const deltaY = startY.current - e.clientY;
    const steps = Math.round(deltaY / 24); // 24px per step
    const newValue = clampValue(startValue.current + steps);
    
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [value, onChange, clampValue]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = '';
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    startValue.current = value;
  }, [value]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const deltaY = startY.current - e.touches[0].clientY;
    const steps = Math.round(deltaY / 24);
    const newValue = clampValue(startValue.current + steps);
    
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [value, onChange, clampValue]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  const prevValue = clampValue(value - 1);
  const nextValue = clampValue(value + 1);

  return (
    <div className={styles.drumPicker}>
      <span className={styles.label}>{label}</span>
      <div
        ref={containerRef}
        className={styles.drum}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.inactiveValue}>{formatValue(prevValue)}</div>
        <div className={styles.activeValue}>{formatValue(value)}</div>
        <div className={styles.inactiveValue}>{formatValue(nextValue)}</div>
      </div>
    </div>
  );
}
