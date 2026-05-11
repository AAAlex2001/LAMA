'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { ChevronDownIcon } from '@/components/icons';
import styles from './styles.module.scss';

export interface DropdownBaseProps {
  label: string;
  children: ReactNode;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
  closeOnOutsideClick?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Тонкая обёртка дропдауна: label + chevron + open/close + click-outside.
 * Контент задаётся children — конкретная бизнес-логика живёт в обёртках
 * (ChannelPicker, RepeatSettings, AutoDeletePicker, ...).
 */
export default function DropdownBase({
  label,
  children,
  isOpen: controlledIsOpen,
  onToggle,
  onOpen,
  onClose,
  closeOnOutsideClick = true,
  compact = false,
  className,
}: DropdownBaseProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isOpen = controlledIsOpen ?? internalIsOpen;

  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        if (onToggle) onToggle(false);
        else setInternalIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnOutsideClick, onToggle]);

  function handleToggle() {
    const willOpen = !isOpen;
    if (onToggle) onToggle(willOpen);
    else setInternalIsOpen(willOpen);
    if (willOpen) onOpen?.();
    else onClose?.();
  }

  return (
    <div
      ref={ref}
      className={classNames(
        styles.dropdown,
        { [styles.open]: isOpen, [styles.compact]: compact },
        className,
      )}
    >
      <div className={styles.header} onClick={handleToggle}>
        <span className={styles.label}>{label}</span>
        <div className={styles.headerRight}>
          <ChevronDownIcon
            width={16}
            height={16}
            className={classNames(styles.chevron, { [styles.rotated]: isOpen })}
          />
        </div>
      </div>

      {isOpen && <div className={styles.content}>{children}</div>}
    </div>
  );
}
