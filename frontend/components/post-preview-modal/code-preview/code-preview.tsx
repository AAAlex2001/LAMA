'use client';

import styles from './code-preview.module.scss';

interface CodePreviewProps {
  language?: string;
  code: string;
}

export default function CodePreview({ language, code }: CodePreviewProps) {
  if (!code) return null;

  return (
    <div className={styles.codeWrapper}>
      <div className={styles.codeInner}>
        <div className={styles.scrollBar} />
        <div className={styles.contentWrapper}>
          {language && (
            <div className={styles.codeHeader}>{language}</div>
          )}
          <div className={styles.codeContent}>{code}</div>
        </div>
      </div>
    </div>
  );
}
