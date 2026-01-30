'use client';

import type { RichTextEditorHoveredButton } from '../store';
import Tooltip from '@/components/tooltip/tooltip';
import { TemplatesIcon } from '@/components/icons';
import styles from '../rich-text-editor.module.scss';

interface CharCounterProps {
  charCount: number;
  maxLength: number;
  canSaveSelectionAsTemplate: boolean;
  hoveredButton: RichTextEditorHoveredButton;
  onSaveSelectionAsTemplateMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onHover: (id: RichTextEditorHoveredButton) => void;
  getButtonColor: (id: NonNullable<RichTextEditorHoveredButton>) => string;
}

export default function CharCounter({
  charCount,
  maxLength,
  canSaveSelectionAsTemplate,
  hoveredButton,
  onSaveSelectionAsTemplateMouseDown,
  onHover,
  getButtonColor,
}: CharCounterProps) {
  return (
    <div className={styles.charCountWrapper}>
      <button
        type="button"
        aria-label="Сохранить в шаблоны"
        aria-disabled={!canSaveSelectionAsTemplate}
        className={`${styles.toolButton} ${!canSaveSelectionAsTemplate ? styles.toolButtonDisabled : ''}`}
        onMouseDown={onSaveSelectionAsTemplateMouseDown}
        onMouseEnter={() => onHover('templates')}
        onMouseLeave={() => onHover(null)}
      >
        <TemplatesIcon width={21} height={21} color={getButtonColor('templates')} />
        {hoveredButton === 'templates' && <Tooltip text="сохранить в шаблоны" />}
      </button>
      <span className={`${styles.charCount} ${charCount > maxLength ? styles.charCountOver : ''}`}>
        {charCount}/{maxLength}
      </span>
    </div>
  );
}
