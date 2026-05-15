'use client';

import { PlusIcon, SettingsIcon, TagCloseIcon } from '@/components/icons';
import type { TagColor } from '@/types';
import styles from '../../create-post.module.scss';

export interface SelectedTag {
  id?: number;
  name: string;
  color: TagColor;
}

interface Props {
  tags: SelectedTag[];
  onAddClick: () => void;
  onTagClick: (tag: SelectedTag) => void;
  onRemove: (name: string) => void;
  onSettingsClick?: () => void;
}

export default function SelectedTagsRow({
  tags,
  onAddClick,
  onTagClick,
  onRemove,
  onSettingsClick,
}: Props) {
  return (
    <>
      <div className={styles.headerTagsRow}>
        <button type="button" className={styles.addTagButton} onClick={onAddClick}>
          <span>Добавить тег</span>
          <PlusIcon width={12} height={12} color="#000000" />
        </button>

        {tags.map((tag) => (
          <div
            key={tag.name}
            className={styles.tagChip}
            style={{ backgroundColor: tag.color, cursor: tag.id ? 'pointer' : 'default' }}
            onClick={() => onTagClick(tag)}
          >
            <span className={styles.tagChipText}>{tag.name}</span>
            <button
              type="button"
              className={styles.tagChipClose}
              onClick={(e) => { e.stopPropagation(); onRemove(tag.name); }}
              aria-label={`Удалить тег ${tag.name}`}
            >
              <TagCloseIcon width={12} height={12} color="#000000" />
            </button>
          </div>
        ))}
      </div>

      {onSettingsClick && (
        <button
          className={styles.settingsButton}
          type="button"
          aria-label="Настройки"
          onClick={onSettingsClick}
        >
          <SettingsIcon width={24} height={24} />
        </button>
      )}
    </>
  );
}
