'use client';

import { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './responsive-wrappers.module.scss';

interface MobileWrapperProps {
  children?: ReactNode;
  className?: string;
}

export default function MobileWrapper({ children, className }: MobileWrapperProps) {
  return (
    <div className={classNames(styles.mobileWrapper, className)}>
      {children}
    </div>
  );
}
