'use client';

import { useRef, useEffect, useState } from 'react';
import styles from './IntervalValuePicker.module.scss';

interface IntervalValuePickerProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  max?: number;
}

export default function IntervalValuePicker({
  value,
  onChange,
  label,
  max = 99,
}: IntervalValuePickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const clamp = (val: number): number => {
    if (val < 1) return 1;
    if (val > max) return max;
    return val;
  };

  const handleClick = () => {
    setInputValue(value.toString());
    setIsEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputValue(val);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startValue.current = value;
    document.body.style.userSelect = 'none';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    startValue.current = value;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const deltaY = startY.current - e.touches[0].clientY;
    const steps = Math.round(deltaY / 24);
    const newValue = clamp(startValue.current + steps);
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const el = scrollRef.current;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      onChange(clamp(value + delta));
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaY = startY.current - e.clientY;
      const steps = Math.round(deltaY / 24);
      const newValue = clamp(startValue.current + steps);
      if (newValue !== value) {
        onChange(newValue);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = '';
    };

    el?.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      el?.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [value, onChange, max]);

  const prevValue = value > 1 ? value - 1 : null;
  const nextValue = value < max ? value + 1 : null;

  return (
    <div
      ref={scrollRef}
      className={styles.container}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Row above (prev value) */}
      <div className={styles.row}>
        <div className={`${styles.column} ${styles.columnInactive}`}>
          <span className={`${styles.valueInactive} ${prevValue === null ? styles.hidden : ''}`}>
            {prevValue ?? ''}
          </span>
        </div>
        <div className={`${styles.column} ${styles.columnInactive}`}>
          <span className={styles.hidden}>&nbsp;</span>
        </div>
      </div>

      {/* Active row */}
      <div className={`${styles.row} ${styles.rowActive}`}>
        <div className={styles.column}>
          {isEditing ? (
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className={styles.input}
              autoFocus
              maxLength={2}
            />
          ) : (
            <span className={styles.valueActive} onClick={handleClick}>{value}</span>
          )}
        </div>
        <div className={styles.column}>
          <span className={styles.labelActive}>{label}</span>
        </div>
      </div>

      {/* Row below (next value) */}
      <div className={styles.row}>
        <div className={`${styles.column} ${styles.columnInactive}`}>
          <span className={`${styles.valueInactive} ${nextValue === null ? styles.hidden : ''}`}>
            {nextValue ?? ''}
          </span>
        </div>
        <div className={`${styles.column} ${styles.columnInactive}`}>
          <span className={styles.hidden}>&nbsp;</span>
        </div>
      </div>

      {/* Extra row for 3 */}
      <div className={styles.row}>
        <div className={`${styles.column} ${styles.columnInactive}`}>
          <span className={`${styles.valueInactive} ${value + 2 > max ? styles.hidden : ''}`}>
            {value + 2 <= max ? value + 2 : ''}
          </span>
        </div>
        <div className={`${styles.column} ${styles.columnInactive}`}>
          <span className={styles.hidden}>&nbsp;</span>
        </div>
      </div>
    </div>
  );
}
