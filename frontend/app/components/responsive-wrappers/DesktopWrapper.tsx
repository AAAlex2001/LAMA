'use client';

import { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './responsive-wrappers.module.scss';

interface DesktopWrapperProps {
  children?: ReactNode;
  className?: string;
}

export default function DesktopWrapper({ children, className }: DesktopWrapperProps) {
  return (
    <div className={classNames(styles.desktopWrapper, className)}>
      {children}
    </div>
  );
}
