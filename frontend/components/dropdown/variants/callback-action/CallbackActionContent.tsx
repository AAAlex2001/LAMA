'use client';

import styles from './callback-action.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import type { CallbackActionContentProps, CallbackActionOption } from '../../types';

type CallbackActionOptionItem = { id: CallbackActionOption; label: string };

const CALLBACK_ACTION_OPTIONS: CallbackActionOptionItem[] = [
  { id: 'send_dm', label: 'Отправить сообщение в личку' },
  { id: 'reply_in_chat', label: 'Ответ в чате / канале' },
  { id: 'track_click', label: 'Зафиксировать клик' },
];

export default function CallbackActionContent({
  callbackActionValue,
  onCallbackActionChange,
}: CallbackActionContentProps) {
  return (
    <div className={styles.optionsList}>
      {CALLBACK_ACTION_OPTIONS.map((option) => (
        <div key={option.id} className={styles.optionRow}>
          <Checkbox
            variant="radio"
            checked={callbackActionValue === option.id}
            onChange={() => onCallbackActionChange?.(option.id)}
          />
          <span className={styles.optionLabel}>{option.label}</span>
        </div>
      ))}
    </div>
  );
}
