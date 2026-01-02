'use client';

import Button from '@/components/button/button';
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
        <Button text={buttonText} href={buttonLink} fullWidth showArrow />
      </div>
    </div>
  );
}
