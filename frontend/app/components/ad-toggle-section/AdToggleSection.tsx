'use client';

import { useState } from 'react';
import classnames from 'classnames';
import Input from '@/components/input/input';
import CurrencySelect from '@/components/currency-select';
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

export default function AdToggleSection({ value, onChange }: AdToggleSectionProps) {
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
        <>
          <Input
            value={value.buyer}
            onChange={(v) => setField('buyer', v)}
            placeholder="Покупатель.."
          />
          <div className={styles.amountRow}>
            <Input
              value={value.amount}
              onChange={(v) => setField('amount', v)}
              placeholder="0"
            />
            <CurrencySelect
              value={value.currency}
              onChange={(v) => setField('currency', v)}
            />
          </div>
          <Input
            value={value.note}
            onChange={(v) => setField('note', v)}
            placeholder="Введите примечание для учета рекламных доходов.."
          />
        </>
      )}
    </div>
  );
}
