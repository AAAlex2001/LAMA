'use client';

import React from 'react';
import Button from '@/components/button/button';
import { TrashIcon } from '@/components/icons';
import Tooltip from '@/components/tooltip/tooltip';
import styles from './limits-modal.module.scss';

interface LimitItem {
  id: string;
  name: string;
}

interface LimitSection {
  title: string;
  items: LimitItem[];
  current: number;
  total: number;
  onAdd?: () => void;
  onDelete?: (id: string) => void;
}

interface LimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: LimitSection[];
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className={styles.deleteWrap}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Удалить"
      >
        <TrashIcon width={15} height={16.67} />
      </button>
      {hovered && <Tooltip text="Удалить" />}
    </div>
  );
}

function SectionBlock({ section }: { section: LimitSection }) {
  const isFull = section.current >= section.total;

  return (
    <div className={styles.section}>
      <span className={styles.sectionTitle}>{section.title}</span>
      <Button
        text="Подключить новый"
        showArrow={false}
        fullWidth
        variant={isFull ? 'delete' : 'default'}
        className={`${styles.addBtn} ${isFull ? styles.addBtnFull : ''}`}
        counter={`${section.current}/${section.total}`}
        onClick={!isFull ? section.onAdd : undefined}
      />
      {isFull && (
        <span className={styles.upgradeText}>Обновите план, чтобы увеличить лимит</span>
      )}
      {section.items.length > 0 && (
        <div className={styles.itemList}>
          {section.items.map((item) => (
            <div key={item.id} className={styles.item}>
              <span className={styles.itemName}>{item.name}</span>
              <DeleteButton onDelete={() => section.onDelete?.(item.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LimitsModal({ isOpen, onClose, sections }: LimitsModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.content}>
          <h2 className={styles.title}>Подключения и лимиты</h2>
          {sections.map((section) => (
            <SectionBlock key={section.title} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
