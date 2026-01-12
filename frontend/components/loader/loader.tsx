'use client';

import styles from './loader.module.scss';
import classNames from 'classnames';

interface LoaderProps {
  size?: number;
  color?: 'blue' | 'white' | 'inherit';
  className?: string;
}

export default function Loader({ 
  size = 18, 
  color = 'inherit',
  className 
}: LoaderProps) {
  return (
    <span 
      className={classNames(styles.loader, styles[color], className)}
      style={{ width: size, height: size }}
    />
  );
}
