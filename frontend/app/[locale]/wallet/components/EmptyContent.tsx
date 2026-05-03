'use client';

import { Button } from '@/components/new-button';
import styles from './EmptyContent.module.scss';

interface EmptyContentProps {
  title: string;
  description: string;
  buttonText: string;
  onButtonClick?: () => void;
}

export default function EmptyContent({ title, description, buttonText, onButtonClick }: EmptyContentProps) {
  return (
    <div className={styles.body}>
      <div className={styles.text}>
        <p className={styles.title}>{title}</p>
        <p className={styles.description}>{description}</p>
      </div>
      <Button variant="fill" intent="gradient" size="lg" onClick={onButtonClick}>
        {buttonText}
      </Button>
    </div>
  );
}
