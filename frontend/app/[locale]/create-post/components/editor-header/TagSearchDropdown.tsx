'use client';

import TrashIcon from '@/components/icons/trash-icon';
import Loader from '@/components/loader';
import type { Tag } from '@/types';
import tagStyles from '../../tags.module.scss';

interface Props {
  results: Tag[];
  isLoading: boolean;
  isSearchActive: boolean;
  onPick: (tag: Tag) => void;
  onEditPick: (tag: Tag) => void;
  onDelete: (tagId: number) => void;
}

export default function TagSearchDropdown({
  results,
  isLoading,
  isSearchActive,
  onPick,
  onEditPick,
  onDelete,
}: Props) {
  if (isLoading) {
    return (
      <div className={tagStyles.tagSearchDropdown}>
        <div className={tagStyles.tagDropdownLoading}>
          <Loader size={24} color="blue" />
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    if (!isSearchActive) return null;
    return (
      <div className={tagStyles.tagSearchDropdown}>
        <span className={tagStyles.tagSearchDropdownTitle}>Ничего не найдено</span>
      </div>
    );
  }

  return (
    <div className={tagStyles.tagSearchDropdown}>
      <span className={tagStyles.tagSearchDropdownTitle}>Созданные теги</span>
      <div className={tagStyles.tagSearchDropdownScroll}>
        {results.map((tag) => (
          <div key={tag.id} className={tagStyles.tagSearchResultRow}>
            <button
              type="button"
              className={tagStyles.tagSearchResultChip}
              style={{ backgroundColor: tag.color || '#B8DBF1' }}
              onClick={() => onPick(tag)}
              onDoubleClick={() => onEditPick(tag)}
            >
              <span className={tagStyles.tagSearchResultChipText}>{tag.name}</span>
            </button>
            <button
              type="button"
              className={tagStyles.tagSearchDeleteBtn}
              onClick={() => onDelete(tag.id)}
              aria-label={`Удалить тег ${tag.name}`}
            >
              <TrashIcon width={15} height={17} color="#B0B4B8" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
