'use client';

import { useEffect, useRef } from 'react';
import styles from './tools-popup.module.scss';

interface ToolsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  anchorElement?: HTMLElement | null;
  variant?: 'header' | 'mobile';
  items?: Array<{ title: string; description?: string | null; href: string; order?: number }>;
}

export default function ToolsPopup({ isOpen, onClose, anchorElement, variant = 'header', items }: ToolsPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popupRef.current && 
        !popupRef.current.contains(target) &&
        anchorElement &&
        !anchorElement.contains(target)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorElement]);

  if (!isOpen) return null;

  const variantClass = variant === 'mobile' ? styles.mobile : undefined;

  const list = items && items.length > 0
    ? [...items].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    : [];

  if (list.length === 0) return null;

  return (
    <div className={[styles.popup, variantClass].filter(Boolean).join(' ')} ref={popupRef}>
      <div className={styles.content}>
        {list.map((item, index) => (
          <a 
            key={index} 
            href={item.href} 
            className={styles.item}
            onClick={onClose}
          >
            <div className={styles.title}>{item.title}</div>
            {item.description && <div className={styles.description}>{item.description}</div>}
          </a>
        ))}
      </div>
    </div>
  );
}

