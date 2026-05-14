'use client';

import { FC } from 'react';
import Checkbox from '@/components/checkbox/checkbox';
import styles from './styles.module.scss';

export type ExportFormat = 'xlsx' | 'csv';

interface Step3FormatProps {
  value: ExportFormat;
  onChange: (next: ExportFormat) => void;
}

const Step3Format: FC<Step3FormatProps> = ({ value, onChange }) => (
  <div className={styles.body}>
    <div className={styles.formatList}>
      <div className={styles.row} onClick={() => onChange('xlsx')}>
        <Checkbox variant="radio" checked={value === 'xlsx'} onChange={() => onChange('xlsx')} />
        <span className={styles.rowLabel}>Excel (.xlsx)</span>
      </div>
      <div className={styles.row} onClick={() => onChange('csv')}>
        <Checkbox variant="radio" checked={value === 'csv'} onChange={() => onChange('csv')} />
        <span className={styles.rowLabel}>CSV</span>
      </div>
    </div>
    <div className={styles.formatHint}>
      Excel удобен для просмотра, CSV — для аналитики и загрузки в другие системы
    </div>
  </div>
);

export default Step3Format;
