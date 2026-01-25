'use client';

import styles from './inline-keyboard-preview.module.scss';
import { PreviewArrowIcon } from '@/components/icons';

export interface InlineKeyboardButtonPreview {
  text: string;
  type?: 'url' | 'callback' | 'hidden_text';
}

export interface InlineKeyboardPreviewData {
  buttons: InlineKeyboardButtonPreview[][];
}

interface InlineKeyboardPreviewProps {
  keyboard: InlineKeyboardPreviewData;
}

export default function InlineKeyboardPreview({ keyboard }: InlineKeyboardPreviewProps) {
  if (!keyboard?.buttons?.length) return null;

  return (
    <div className={styles.keyboard}>
      {keyboard.buttons.map((row, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={row.every((btn) => btn.type === 'url') ? styles.linkRow : styles.managerRow}
        >
          {row.map((button, btnIndex) => (
            <div
              key={`btn-${rowIndex}-${btnIndex}`}
              className={`${styles.button} ${button.type === 'url' ? styles.linkButton : styles.managerButton}`}
            >
              <span className={styles.buttonText}>{button.text}</span>
              {button.type === 'url' && (
                <span className={styles.linkIcon}>
                  <PreviewArrowIcon width={10} height={10} color="#FFFFFF" />
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
