'use client';

import classNames from 'classnames';
import PlusIcon from '@/components/icons/plus-icon';
import styles from './AddIconButton.module.scss';

interface AddIconButtonProps {
  size?: 'sm' | 'lg';
  ariaLabel: string;
  onClick?: () => void;
  className?: string;
}

const ICON_SIZE: Record<NonNullable<AddIconButtonProps['size']>, number> = {
  sm: 16,
  lg: 24,
};

export default function AddIconButton({ size = 'sm', ariaLabel, onClick, className }: AddIconButtonProps) {
  const dimension = ICON_SIZE[size];
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={classNames(styles.btn, styles[size], className)}
    >
      <PlusIcon width={dimension} height={dimension} color="#3B82F6" />
    </button>
  );
}
