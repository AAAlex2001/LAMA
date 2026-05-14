'use client';

import { FC } from 'react';
import Checkbox from '@/components/checkbox/checkbox';
import styles from './styles.module.scss';

export type ExportRecordsScope = 'filtered' | 'all';

interface Step2RecordsScopeProps {
  value: ExportRecordsScope;
  onChange: (next: ExportRecordsScope) => void;
  periodLabel?: string;
}

const Step2RecordsScope: FC<Step2RecordsScopeProps> = ({ value, onChange, periodLabel }) => {
  const filteredHint = periodLabel
    ? `Будут выгружены данные с учётом выбранного периода и фильтров. Выбранный период: ${periodLabel}`
    : 'Будут выгружены данные с учётом выбранного периода и фильтров.';

  return (
    <div className={styles.body}>
      <div className={styles.radioBlock}>
        <div className={styles.radioRow} onClick={() => onChange('filtered')}>
          <Checkbox variant="radio" checked={value === 'filtered'} onChange={() => onChange('filtered')} />
          <span className={styles.rowLabel}>С текущими фильтрами</span>
        </div>
        <div className={styles.radioHint}>{filteredHint}</div>
      </div>

      <div className={styles.row} onClick={() => onChange('all')}>
        <Checkbox variant="radio" checked={value === 'all'} onChange={() => onChange('all')} />
        <span className={styles.rowLabel}>Все данные</span>
      </div>
    </div>
  );
};

export default Step2RecordsScope;
