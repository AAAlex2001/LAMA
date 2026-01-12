'use client';

import { useId } from 'react';
import styles from './input.module.scss';
import classNames from 'classnames';

interface InputProps {
  label?: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  onIconClick?: () => void;
  iconDisabled?: boolean;
  variant?: 'default' | 'white';
}

export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  className,
  icon,
  onIconClick,
  iconDisabled = false,
  variant = 'default',
}: InputProps) {
  const id = useId();

  return (
    <div className={classNames(styles.inputWrapper, className)}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputContainer}>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={classNames(styles.input, {
            [styles.error]: error,
            [styles.disabled]: disabled,
            [styles.withIcon]: icon,
            [styles.white]: variant === 'white',
          })}
        />
        {icon && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onIconClick}
            disabled={iconDisabled || disabled}
          >
            {icon}
          </button>
        )}
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
