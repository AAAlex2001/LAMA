'use client';

import { useId, ReactNode } from 'react';
import styles from "./button.module.scss";

import classNames from "classnames";

interface ButtonProps {
  text: string;
  href?: string;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
  fullWidth?: boolean;
  active?: boolean;
  size?: 'default' | 'small' | 'medium';
  variant?: 'default' | 'templateCard';
  icon?: ReactNode;
  loading?: boolean;
  counter?: string;
  disabled?: boolean;
}

export default function Button({ 
  text, 
  href, 
  onClick, 
  showArrow = true,
  className,
  active = false,
  fullWidth = false,
  size = 'default',
  variant = 'default',
  icon,
  loading = false,
  counter,
  disabled = false,
}: ButtonProps) {
  const gradientId = useId();
  
  const buttonContent = (
    <>
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {icon && <span className={styles.buttonIcon}>{icon}</span>}
          <span className={styles.buttonText}>{text}</span>
          {counter && <span className={styles.counter}>{counter}</span>}
          {showArrow && (
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 7L9 13M15 7L9 1M15 7H1" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id={gradientId} x1="8" y1="1" x2="8" y2="13" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6"/>
                  <stop offset="0.5" stopColor="#2F67C3"/>
                  <stop offset="0.75" stopColor="#295AAA"/>
                  <stop offset="0.875" stopColor="#26539D"/>
                  <stop offset="0.9375" stopColor="#244F96"/>
                  <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
              </defs>
            </svg>
          )}
        </>
      )}
    </>
  );

  const wrapperClasses = classNames(
      styles.buttonWrapper,
      className,
      {
        [styles.fullWidthWrapper]: fullWidth,
        [styles.smallWrapper]: size === 'small',
        [styles.mediumWrapper]: size === 'medium',
        [styles.templateCardWrapper]: variant === 'templateCard',
      }
  );

  const buttonClasses = classNames(
      styles.button,
      {
        [styles.fullWidthButton]: fullWidth,
        [styles.active]: active,
        [styles.smallButton]: size === 'small',
        [styles.mediumButton]: size === 'medium',
        [styles.templateCardButton]: variant === 'templateCard',
        [styles.disabled]: disabled,
      }
  );

  if (href) {
    return (
      <div className={wrapperClasses}>
        <a href={href} className={buttonClasses}>
          {buttonContent}
        </a>
      </div>
    );
  }

  return (
    <div className={wrapperClasses}>
      <button onClick={onClick} className={buttonClasses} disabled={disabled || loading}>
        {buttonContent}
      </button>
    </div>
  );
}
