'use client';

import styles from './checkbox.module.scss';
import classNames from 'classnames';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string | React.ReactNode;
  className?: string;
}

export default function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <label className={classNames(styles.container, className)}>
      <div 
        className={classNames(styles.checkbox, { [styles.checked]: checked })}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <span className={styles.label}>{label}</span>
    </label>
  );
}
