'use client';

import { FC } from 'react';
import { Button } from '@/components/new-button';
import styles from './styles.module.scss';

interface EmptyStateProps {
  onConnect: () => void;
}

const EmptyState: FC<EmptyStateProps> = ({ onConnect }) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.text}>
          <span className={styles.title}>Каналы и группы ещё не подключены</span>
          <span className={styles.subtitle}>
            Подключите канал или группу, чтобы управлять модерацией, приглашениями и резервным копированием
          </span>
        </div>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          onClick={onConnect}
        >
          Подключить канал или группу
        </Button>
      </div>
    </div>
  );
};

export default EmptyState;
