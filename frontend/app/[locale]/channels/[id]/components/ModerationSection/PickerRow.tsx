import { FC, ReactNode } from 'react';
import { ChevronIcon } from './helpers';
import styles from '../ModerationSection.module.scss';

interface PickerRowProps {
  label: string;
  value: ReactNode;
  open: boolean;
  onToggle: () => void;
}

const PickerRow: FC<PickerRowProps> = ({ label, value, open, onToggle }) => (
  <div className={styles.pickerRow} onClick={onToggle}>
    <span className={styles.pickerLabel}>{label}</span>
    <div className={styles.pickerRight}>
      <span className={styles.pickerValueText}>{value}</span>
      <ChevronIcon className={`${styles.pickerChevron} ${open ? styles.open : ''}`} />
    </div>
  </div>
);

export default PickerRow;
