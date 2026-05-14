'use client';

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
  locked?: boolean;
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

export default function AdToggleSection({ value, onChange, locked = false }: AdToggleSectionProps) {
  const setField = <K extends keyof AdToggleValue>(key: K, val: AdToggleValue[K]) => {
    onChange({ ...value, [key]: val });
  };

  const toggle = () => {
    if (locked) return;
    onChange({ ...value, enabled: !value.enabled });
  };

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.toggleRow}
        onClick={toggle}
        disabled={locked}
        aria-disabled={locked}
        style={locked ? { cursor: 'default' } : undefined}
      >
        <span className={styles.label}>Реклама</span>
        <span className={classnames(styles.switch, { [styles.switchOn]: value.enabled })}>
          <span className={styles.knob} />
        </span>
      </button>

      {value.enabled && (
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
