'use client';

import { Button } from '@/components/new-button';
import styles from './template-card.module.scss';

type Props = {
  title: string;
  text: string;
  buttonText: string;
  buttonLink?: string;
};

export default function TemplateCard({ title, text, buttonText, buttonLink }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <div className={styles.heading}>
          <div className={styles.title}>{title}</div>
        </div>
        <div className={styles.textRow}>
          <div className={styles.text}>{text}</div>
        </div>
      </div>

      <div className={styles.buttonRow}>
        <Button
          href={buttonLink}
          variant="outline"
          intent="gradient"
          size="lg"
          style={{ width: '100%' }}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
