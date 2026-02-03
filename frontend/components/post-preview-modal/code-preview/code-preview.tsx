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

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const { detectedLanguage, highlightedCode } = useMemo(() => {
    const lang = language || detectLanguage(code);
    const isPlain = lang === 'plaintext' || !hljs.getLanguage(lang);

    if (isPlain) {
      return {
        detectedLanguage: 'plaintext',
        highlightedCode: escapeHtml(code),
      };
    }

    try {
      const result = hljs.highlight(code, {
        language: lang,
        ignoreIllegals: true,
      });
      return {
        detectedLanguage: lang,
        highlightedCode: result.value,
      };
    } catch {
      return {
        detectedLanguage: 'plaintext',
        highlightedCode: escapeHtml(code),
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
