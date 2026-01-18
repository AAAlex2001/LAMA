'use client';

import styles from './quiz-preview.module.scss';
import type { QuizPreviewData } from '../store';

export interface QuizPreviewProps {
  data: QuizPreviewData;
}

export default function QuizPreview({ data }: QuizPreviewProps) {
  if (!data.question || data.options.length === 0) return null;

  const isQuiz = data.mode === 'quiz';

  const subtitle = data.isAnonymous
    ? isQuiz
      ? 'Анонимная викторина'
      : 'Анонимный опрос'
    : isQuiz
    ? 'Публичная викторина'
    : 'Публичный опрос';

  const footerText = isQuiz ? 'Ответов пока нет' : 'Проголосовать';

  return (
    <div className={`${styles.bubble} ${!isQuiz ? styles.isPoll : ''}`}>
      <div className={styles.header}>
        <div className={styles.title}>{data.question}</div>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>

      <div className={styles.options}>
        {data.options.map((opt, idx) => (
          <div key={idx} className={styles.option}>
            <div className={styles.radioButton} />
            <div className={styles.optionText}>{opt}</div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div className={styles.footerText}>{footerText}</div>
      </div>
    </div>
  );
}
