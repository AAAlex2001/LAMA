'use client';

import { FC } from 'react';
import Checkbox from '@/components/checkbox/checkbox';
import styles from './styles.module.scss';

export interface ExportDataType {
  generalIncome: boolean;
  generalExpense: boolean;
  adsIncome: boolean;
  adsExpense: boolean;
}

interface Step1DataTypeProps {
  value: ExportDataType;
  onChange: (next: ExportDataType) => void;
}

const Step1DataType: FC<Step1DataTypeProps> = ({ value, onChange }) => {
  const update = (key: keyof ExportDataType) => (next: boolean) =>
    onChange({ ...value, [key]: next });

  return (
    <div className={styles.body}>
      <div className={styles.group}>
        <div className={styles.groupHeader}>Общие показатели</div>
        <div className={styles.row} onClick={() => update('generalIncome')(!value.generalIncome)}>
          <Checkbox checked={value.generalIncome} onChange={update('generalIncome')} />
          <span className={styles.rowLabel}>Доходы</span>
        </div>
        <div className={styles.row} onClick={() => update('generalExpense')(!value.generalExpense)}>
          <Checkbox checked={value.generalExpense} onChange={update('generalExpense')} />
          <span className={styles.rowLabel}>Расходы</span>
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupHeader}>Эффективность рекламы</div>
        <div className={styles.row} onClick={() => update('adsIncome')(!value.adsIncome)}>
          <Checkbox checked={value.adsIncome} onChange={update('adsIncome')} />
          <span className={styles.rowLabel}>Доходы</span>
        </div>
        <div className={styles.row} onClick={() => update('adsExpense')(!value.adsExpense)}>
          <Checkbox checked={value.adsExpense} onChange={update('adsExpense')} />
          <span className={styles.rowLabel}>Расходы</span>
        </div>
      </div>
    </div>
  );
};

export default Step1DataType;
