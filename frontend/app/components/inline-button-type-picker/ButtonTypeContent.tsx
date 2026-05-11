'use client';

import styles from './button-type.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import type { ButtonTypeContentProps, ButtonTypeOption } from './types';

type ButtonTypeOptionItem = { id: ButtonTypeOption; label: string };

const BUTTON_TYPE_OPTIONS: ButtonTypeOptionItem[] = [
  { id: 'url', label: 'URL' },
  { id: 'hidden_text', label: 'Скрытый текст' },
  { id: 'callback', label: 'Callback' },
];

export default function ButtonTypeContent({
  buttonTypeValue,
  onButtonTypeChange,
}: ButtonTypeContentProps) {
  return (
    <div className={styles.optionsList}>
      {BUTTON_TYPE_OPTIONS.map((option) => (
        <div key={option.id} className={styles.optionRow}>
          <Checkbox
            variant="radio"
            checked={buttonTypeValue === option.id}
            onChange={() => onButtonTypeChange?.(option.id)}
          />
          <span className={styles.optionLabel}>{option.label}</span>
        </div>
      ))}
    </div>
  );
}
