'use client';

import { FC, useState } from 'react';
import Input from '@/components/input';
import Loader from '@/components/loader';
import { Button } from '@/components/new-button';
import { PlusIcon, TrashIcon, AiEditIcon } from '@/components/icons';
import { useSynonymsAi } from './useSynonymsAi';
import styles from '../CreateAutoReplyModal.module.scss';

interface KeywordsSectionProps {
  keywords: string[];
  onAdd: (words: string[]) => void;
  onRemove: (index: number) => void;
}

const KeywordsSection: FC<KeywordsSectionProps> = ({ keywords, onAdd, onRemove }) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [aiTooltipVisible, setAiTooltipVisible] = useState(false);
  const synonyms = useSynonymsAi();

  const validKeywords = keywords
    .map((kw, i) => ({ kw, i }))
    .filter(({ kw }) => kw.trim());
  const half = Math.ceil(validKeywords.length / 2);
  const leftKeywords = validKeywords.slice(0, half);
  const rightKeywords = validKeywords.slice(half);

  const handleAdd = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    onAdd([trimmed]);
    setNewKeyword('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const renderKeywordColumn = (entries: { kw: string; i: number }[]) => (
    <div className={styles.keywordsColumn}>
      {entries.map(({ kw, i }) => (
        <div key={i} className={styles.keywordRow}>
          <div className={styles.keywordDot} />
          <span className={styles.keywordText}>{kw}</span>
          <Button
            variant="ghost"
            intent="neutral"
            size="transparent"
            className={styles.keywordDeleteBtn}
            onClick={() => onRemove(i)}
          >
            <TrashIcon width={13} height={13} color="currentColor" />
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <span className={styles.sectionLabel}>Триггер-фразы</span>
      <div className={styles.keywordInputWrapper}>
        <div className={styles.keywordInputRow}>
          <Input
            className={styles.keywordInput}
            placeholder="Введите слово или фразу"
            value={newKeyword}
            onChange={setNewKeyword}
            onKeyDown={handleKeyDown}
            icons={[
              {
                icon: synonyms.loading
                  ? <Loader size={18} color="blue" />
                  : <AiEditIcon width={21} height={21} color={newKeyword.trim() ? '#3B82F6' : '#000000'} />,
                onClick: () => synonyms.fetchSynonyms(newKeyword.trim()),
                onMouseEnter: () => setAiTooltipVisible(true),
                onMouseLeave: () => setAiTooltipVisible(false),
                disabled: synonyms.loading || !newKeyword.trim(),
              },
            ]}
          />
          <button
            type="button"
            className={styles.addKeywordBtn}
            onClick={handleAdd}
            disabled={!newKeyword.trim()}
          >
            <PlusIcon width={16} height={16} color="#3B82F6" />
          </button>
        </div>

        {aiTooltipVisible && (
          <div className={styles.aiTooltip}>Найти список синонимов</div>
        )}
      </div>

      {validKeywords.length > 0 && (
        <div className={styles.keywordsColumns}>
          {renderKeywordColumn(leftKeywords)}
          {rightKeywords.length > 0 && renderKeywordColumn(rightKeywords)}
        </div>
      )}

      {(synonyms.suggestions.length > 0 || synonyms.loading) && (
        <div className={styles.synonymPanel}>
          <div className={styles.synonymPanelHeader}>
            <span className={styles.synonymLabel}>
              {synonyms.loading
                ? `Ищу синонимы для «${synonyms.forWord}»...`
                : `Синонимы для «${synonyms.forWord}»`}
            </span>
            {!synonyms.loading && (
              <button type="button" className={styles.synonymDismiss} onClick={synonyms.clear}>
                ✕
              </button>
            )}
          </div>
          {synonyms.loading ? (
            <div className={styles.synonymLoadingRow}>
              <Loader size={18} color="blue" />
            </div>
          ) : (
            <div className={styles.synonymChips}>
              {synonyms.suggestions.map((w, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.synonymChip} ${keywords.includes(w) ? styles.synonymChipAdded : ''}`}
                  onClick={() => { if (!keywords.includes(w)) onAdd([w]); }}
                  disabled={keywords.includes(w)}
                >
                  {keywords.includes(w) ? '✓ ' : '+ '}{w}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KeywordsSection;
