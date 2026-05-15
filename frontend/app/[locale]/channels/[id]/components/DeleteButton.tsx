'use client';

import { FC, useState } from 'react';
import { TrashIcon } from '@/components/icons';
import styles from './DeleteButton.module.scss';

interface DeleteButtonProps {
  onClick: () => void;
}

const DeleteButton: FC<DeleteButtonProps> = ({ onClick }) => {
  const [active, setActive] = useState(false);

  return (
    <button
      className={`${styles.btn} ${active ? styles.active : ''}`}
      type="button"
      aria-label="Удалить канал"
      onClick={() => {
        setActive(true);
        onClick();
      }}
    >
      <TrashIcon width={15} height={17} />
      <span className={styles.text}>Удалить канал</span>
    </button>
  );
};

export default DeleteButton;
