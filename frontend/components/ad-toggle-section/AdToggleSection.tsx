'use client';

import { useState } from 'react';
import classnames from 'classnames';
import { Button } from '@/components/new-button';
import styles from './AdToggleSection.module.scss';

export interface AdToggleValue {
  enabled: boolean;
  buyer: string;
  amount: string;
  currency: string;
  note: string;
}

interface AdToggleSectionProps {
  value: AdToggleValue;
  onChange: (value: AdToggleValue) => void;
  onAttachPost?: () => void;
}

const DEFAULT: AdToggleValue = {
  enabled: false,
  buyer: '',
  amount: '',
  currency: 'RUB',
  note: '',
};

export function emptyAdToggleValue(): AdToggleValue {
  return { ...DEFAULT };
}

export default function AdToggleSection({ value, onChange, onAttachPost }: AdToggleSectionProps) {
  const [showFields, setShowFields] = useState(value.enabled);

  const setField = <K extends keyof AdToggleValue>(key: K, val: AdToggleValue[K]) => {
    onChange({ ...value, [key]: val });
  };

  const toggle = () => {
    const next = !value.enabled;
    setShowFields(next);
    onChange({ ...value, enabled: next });
  };

  return (
    <div className={styles.section}>
      <button type="button" className={styles.toggleRow} onClick={toggle}>
        <span className={styles.label}>Реклама</span>
        <span className={classnames(styles.switch, { [styles.switchOn]: value.enabled })}>
          <span className={styles.knob} />
        </span>
      </button>

      {showFields && value.enabled && (
        <div className={styles.fields}>
          <input
            type="text"
            className={styles.input}
            placeholder="Покупатель.."
            value={value.buyer}
            onChange={(e) => setField('buyer', e.target.value)}
          />
          <div className={styles.amountRow}>
            <input
              type="number"
              className={styles.input}
              placeholder="0"
              value={value.amount}
              onChange={(e) => setField('amount', e.target.value)}
            />
            <select
              className={styles.currencySelect}
              value={value.currency}
              onChange={(e) => setField('currency', e.target.value)}
            >
              <option value="RUB">РУБ</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <input
            type="text"
            className={styles.input}
            placeholder="Введите примечание для учета рекламных доходов.."
            value={value.note}
            onChange={(e) => setField('note', e.target.value)}
          />
          <Button
            variant="fill"
            intent="gradient"
            size="lg"
            className={styles.attachBtn}
            onClick={onAttachPost}
          >
            Прикрепить рекламный пост
          </Button>
        </div>
      )}
    </div>
  );
}
