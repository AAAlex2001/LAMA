'use client';

import { useMemo } from 'react';

import styles from './code-preview.module.scss';
import { detectLanguage, getLanguageLabel, hljs } from '@/components/rich-text-editor/editor/detect-language';

interface CodePreviewProps {
  language?: string;
  code: string;
}

export default function CodePreview({ language, code }: CodePreviewProps) {
  if (!code) return null;

  const { detectedLanguage, highlightedCode } = useMemo(() => {
    const lang = language || detectLanguage(code);

    try {
      const result = hljs.highlight(code, {
        language: lang === 'plaintext' ? 'plaintext' : lang,
        ignoreIllegals: true,
      });
      return {
        detectedLanguage: lang,
        highlightedCode: result.value,
      };
    } catch {
      return {
        detectedLanguage: lang,
        highlightedCode: code,
      };
    }
  }, [code, language]);

  const displayLanguage = getLanguageLabel(detectedLanguage);

  return (
    <div className={styles.codeWrapper}>
      <div className={styles.codeInner}>
        <div className={styles.scrollBar} />
        <div className={styles.contentWrapper}>
          <div className={styles.codeHeader}>{displayLanguage}</div>
          <pre className={styles.codeContent}>
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          </pre>
        </div>
      </div>
    </div>
  );
}
