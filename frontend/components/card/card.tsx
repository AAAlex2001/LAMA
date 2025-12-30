'use client';

import { ReactNode } from 'react';
import styles from './card.module.scss';
import classNames from 'classnames';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className, title }: CardProps) {
  return (
    <div className={classNames(styles.card, className)}>
      {title && <h1 className={styles.title}>{title}</h1>}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
