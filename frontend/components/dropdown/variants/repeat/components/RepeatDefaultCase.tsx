'use client';

import styles from '../repeat.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import { ChevronDownIcon } from '@/components/icons';
import type { RepeatOption } from '../../../types';

type RepeatOptionItem = { id: RepeatOption; label: string };

const REPEAT_OPTIONS: RepeatOptionItem[] = [
  { id: 'never', label: 'Никогда' },
  { id: 'daily', label: 'Каждый день' },
  { id: 'weekly', label: 'Каждую неделю' },
  { id: 'monthly', label: 'Каждый месяц' },
  { id: 'yearly', label: 'Каждый год' },
];

interface RepeatDefaultCaseProps {
  repeatValue: RepeatOption;
  onRepeatChange?: (value: RepeatOption) => void;
  onCustomClick?: () => void;
}

export default function RepeatDefaultCase({
  repeatValue,
  onRepeatChange,
  onCustomClick,
}: RepeatDefaultCaseProps) {
  return (
    <>
      <div className={styles.repeatList}>
        {REPEAT_OPTIONS.map((option, index) => (
          <div 
            key={option.id} 
            className={`${styles.repeatRow} ${index === REPEAT_OPTIONS.length - 1 ? styles.repeatRowLast : ''}`}
          >
            <Checkbox
              variant="radio"
              checked={repeatValue === option.id}
              onChange={() => onRepeatChange?.(option.id)}
            />
            <span className={styles.optionLabel}>{option.label}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={styles.customButton}
        onClick={onCustomClick}
      >
        <span className={styles.optionLabel}>Настроить</span>
      </button>
    </>
  );
}
