'use client';

import React from 'react';
import cn from 'classnames';
import Link from 'next/link';
import styles from './styles.module.scss';

export type ButtonVariant = 'fill' | 'outline' | 'ghost' | 'tag';
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


  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        style={style}
        target={target}
        rel={rel}
      >
        {children}
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
      {children}
    </button>
  );
}
