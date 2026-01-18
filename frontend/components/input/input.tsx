'use client';

import { useId } from 'react';
import styles from './input.module.scss';
import classNames from 'classnames';
import Checkbox from '@/components/checkbox/checkbox';

interface InputProps {
  label?: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocus?: boolean;
  error?: string | null;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  onIconClick?: () => void;
  iconDisabled?: boolean;
  icons?: Array<{
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }>;
  variant?: 'default' | 'white';
  iconClassName?: string;
  showRadio?: boolean;
  radioChecked?: boolean;
  onRadioChange?: (checked: boolean) => void;
  showCheckbox?: boolean;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
}

export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onKeyDown,
  inputRef,
  autoFocus = false,
  error,
  disabled = false,
  className,
  icon,
  onIconClick,
  icons,
  showRadio = false,
  radioChecked = false,
  onRadioChange,
  showCheckbox = false,
  checkboxChecked = false,
  onCheckboxChange,
  iconDisabled = false,
  variant = 'default',
  iconClassName,
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
        {showRadio && onRadioChange && (
          <div className={styles.radioWrapper}>
            <Checkbox
              checked={radioChecked}
              onChange={onRadioChange}
              variant="radio"
            />
          </div>
        )}
        {showCheckbox && onCheckboxChange && (
          <div className={styles.radioWrapper}>
            <Checkbox
              checked={checkboxChecked}
              onChange={onCheckboxChange}
            />
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          ref={inputRef}
          autoFocus={autoFocus}
          disabled={disabled}
          className={classNames(styles.input, {
            [styles.error]: error,
            [styles.disabled]: disabled,
            [styles.withIcon]: icon || (icons && icons.length > 0),
            [styles.white]: variant === 'white',
            [styles.withRadio]: showRadio || showCheckbox,
          })}
        />
        {icons && icons.length > 0 ? (
          <div className={styles.iconButtons}>
            {icons.map((item, index) => (
              <button
                key={index}
                type="button"
                className={classNames(styles.iconButton, item.className)}
                onClick={item.onClick}
                disabled={item.disabled || disabled}
              >
                {item.icon}
              </button>
            ))}
          </div>
        ) : (
          icon && (
            <button
              type="button"
              className={classNames(styles.iconButton, iconClassName)}
              onClick={onIconClick}
              disabled={iconDisabled || disabled}
            >
              {icon}
            </button>
          )
        )}
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
