'use client';

import { useState, useRef, useEffect } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [originalValue, setOriginalValue] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, startValue: 0, isDragging: false });

  const clamp = (v: number) => Math.max(1, Math.min(max, v));

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    onChange(clamp(value + (e.deltaY > 0 ? 1 : -1)));
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startValue: value, isDragging: true };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current.isDragging) return;
      const steps = Math.round((dragRef.current.startY - ev.clientY) / 24);
      onChange(clamp(dragRef.current.startValue + steps));
    }

    function onUp() {
      dragRef.current.isDragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function handleTouchStart(e: React.TouchEvent) {
    dragRef.current = { startY: e.touches[0].clientY, startValue: value, isDragging: true };
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragRef.current.isDragging) return;
    const steps = Math.round((dragRef.current.startY - e.touches[0].clientY) / 24);
    onChange(clamp(dragRef.current.startValue + steps));
  }

  function handleTouchEnd() {
    dragRef.current.isDragging = false;
  }

  function handleClick() {
    setOriginalValue(value);
    setInputValue('');
    setIsEditing(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value.replace(/\D/g, '').slice(0, 2));
  }

  function handleInputBlur() {
    if (inputValue.trim() === '') {
      if (originalValue !== null) {
        onChange(originalValue);
      }
    } else {
      const parsed = parseInt(inputValue, 10);
      if (!isNaN(parsed)) onChange(clamp(parsed));
    }
    setIsEditing(false);
    setOriginalValue(null);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleInputBlur();
    if (e.key === 'Escape') setIsEditing(false);
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  const prevValue = value > 1 ? value - 1 : null;
  const nextValue = value < max ? value + 1 : null;
  const nextValue2 = value + 2 <= max ? value + 2 : null;

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.row}>
        <div className={styles.cell}>
          <span className={`${styles.inactive} ${prevValue === null ? styles.hidden : ''}`}>
            {prevValue ?? ''}
          </span>
        </div>
        <div className={styles.cell} />
      </div>

      <div className={`${styles.row} ${styles.rowActive}`}>
        <div className={styles.cell}>
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
            <span className={styles.active} onClick={handleClick}>{value}</span>
          )}
        </div>
        <div className={styles.cell}>
          <span className={styles.label}>{label}</span>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.cell}>
          <span className={`${styles.inactive} ${nextValue === null ? styles.hidden : ''}`}>
            {nextValue ?? ''}
          </span>
        </div>
        <div className={styles.cell} />
      </div>

      <div className={styles.row}>
        <div className={styles.cell}>
          <span className={`${styles.inactive} ${nextValue2 === null ? styles.hidden : ''}`}>
            {nextValue2 ?? ''}
          </span>
        </div>
        <div className={styles.cell} />
      </div>
    </div>
  );
}
