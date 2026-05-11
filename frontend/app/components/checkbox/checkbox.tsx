'use client';

import styles from './checkbox.module.scss';
import classNames from 'classnames';
import type { ReactNode, ChangeEvent } from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | ReactNode;
  className?: string;
  variant?: 'checkbox' | 'radio';
}

export default function Checkbox({ checked, onChange, label, className, variant = 'checkbox' }: CheckboxProps) {
  const type = variant === 'radio' ? 'radio' : 'checkbox';

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label
      className={classNames(styles.container, className)}
      data-prevent-row-toggle
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        className={styles.input}
        type={type}
        checked={checked}
        onChange={handleChange}
        data-prevent-row-toggle
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />
      <span
        aria-hidden="true"
        className={classNames(styles.checkbox, {
          [styles.checked]: checked,
          [styles.radio]: variant === 'radio',
        })}
      >
        {checked && variant === 'checkbox' && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {checked && variant === 'radio' && <span className={styles.radioCheck} />}
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}
