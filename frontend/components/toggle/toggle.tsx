'use client';

import styles from './toggle.module.scss';
import classNames from 'classnames';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function Toggle({ checked, onChange, disabled = false, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={classNames(styles.toggle, { [styles.checked]: checked, [styles.disabled]: disabled }, className)}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.button} />
    </button>
  );
}
