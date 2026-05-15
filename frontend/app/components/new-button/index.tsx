'use client';

import React from 'react';
import cn from 'classnames';
import Link from 'next/link';
import Loader from '@/components/loader/loader';
import styles from './styles.module.scss';

export type ButtonVariant = 'fill' | 'outline' | 'ghost' | 'tag' | 'soft';
export type ButtonIntent = 'primary' | 'gradient' | 'destructive' | 'neutral' | 'white';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'transparent';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  intent?: ButtonIntent;
  size?: ButtonSize;
  loading?: boolean;
  href?: string;
  target?: string;
  rel?: string;
}

export function Button({
  variant = 'fill',
  intent = 'primary',
  size = 'md',
  loading = false,
  href,
  target,
  rel,
  className,
  style,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = cn(
    styles.btn,
    styles[variant],
    styles[intent],
    styles[size],
    { [styles.loading]: loading },
    className,
  );

  const getLoaderColor = (): 'blue' | 'white' | 'inherit' => {
    if (intent === 'white' || intent === 'neutral') {
      return 'blue';
    }
    if (variant === 'fill' && (intent === 'primary' || intent === 'gradient' || intent === 'destructive')) {
      return 'white';
    }
    return 'inherit';
  };

  const getLoaderSize = (): number => {
    switch (size) {
      case 'sm':
        return 16;
      case 'lg':
        return 20;
      case 'transparent':
        return 18;
      default:
        return 18;
    }
  };

  const buttonContent = loading ? (
    <Loader size={getLoaderSize()} color={getLoaderColor()} />
  ) : (
    <span className={styles.label}>{children}</span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        style={style}
        target={target}
        rel={rel}
      >
        {buttonContent}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      style={style}
      disabled={disabled || loading}
      {...rest}
    >
      {buttonContent}
    </button>
  );
}
