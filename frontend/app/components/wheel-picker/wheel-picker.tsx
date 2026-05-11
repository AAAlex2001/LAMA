'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './wheel-picker.module.scss';

interface WheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function WheelPicker({
  value,
  onChange,
  min = 0,
  max = 99,
}: WheelPickerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [originalValue, setOriginalValue] = useState<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startY: 0, startValue: 0, isDragging: false });

  const format = (v: number) => v.toString().padStart(2, '0');
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const prev = value > min ? value - 1 : null;
  const next = value < max ? value + 1 : null;

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    onChange(clamp(value + (e.deltaY > 0 ? 1 : -1)));
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startValue: value, isDragging: true };

    function onMove(ev: MouseEvent) {
      if (!dragRef.current.isDragging) return;
      const steps = Math.round((dragRef.current.startY - ev.clientY) / 20);
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
    const steps = Math.round((dragRef.current.startY - e.touches[0].clientY) / 20);
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
    setInputValue(e.target.value.replace(/\D/g, ''));
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
    if (e.key === 'Escape') {
      setIsEditing(false);
      setOriginalValue(null);
    }
  }

  const inputRef = useRef(inputValue);
  const editingRef = useRef(isEditing);
  inputRef.current = inputValue;
  editingRef.current = isEditing;

  useEffect(() => {
    return () => {
      if (editingRef.current && inputRef.current.trim() !== '') {
        const parsed = parseInt(inputRef.current, 10);
        if (!isNaN(parsed)) onChange(clamp(parsed));
      }
    };
  }, []);

  useEffect(() => {
    const el = columnRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  return (
    <div
      ref={columnRef}
      className={styles.column}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <span className={`${styles.inactive} ${prev === null ? styles.hidden : ''}`}>
        {prev !== null ? format(prev) : '00'}
      </span>

      <div className={styles.active}>
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
          <span onClick={handleClick}>{format(value)}</span>
        )}
      </div>

      <span className={`${styles.inactive} ${next === null ? styles.hidden : ''}`}>
        {next !== null ? format(next) : '00'}
      </span>
    </div>
  );
}
