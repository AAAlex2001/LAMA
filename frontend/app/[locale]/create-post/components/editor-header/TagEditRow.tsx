'use client';

import classNames from 'classnames';
import { TagCloseIcon, TrashIcon } from '@/components/icons';
import { Button } from '@/components/new-button';
import type { TagColor } from '@/types';
import TagColorPicker from './TagColorPicker';
import tagStyles from '../../tags.module.scss';

interface Props {
  name: string;
  editName: string;
  editColor: TagColor;
  onNameChange: (value: string) => void;
  onColorChange: (color: TagColor) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export default function TagEditRow({
  name,
  editName,
  editColor,
  onNameChange,
  onColorChange,
  onCancel,
  onSave,
  onDelete,
}: Props) {
  return (
    <div className={tagStyles.tagEditRow}>
      <div className={tagStyles.tagEditTitleRow}>
        <span className={classNames(tagStyles.tagEditLabel, tagStyles.tagEditLabelMobile)}>
          Редактирование тега
        </span>
        <div className={tagStyles.tagEditChip} style={{ backgroundColor: editColor }}>
          <span className={tagStyles.tagEditChipText}>{name}</span>
          <button type="button" className={tagStyles.tagEditChipClose} onClick={onCancel}>
            <TagCloseIcon width={12} height={12} color="#000000" />
          </button>
        </div>
      </div>

      <div className={tagStyles.tagEditBottomRow}>
        <span className={classNames(tagStyles.tagEditLabel, tagStyles.tagEditLabelDesktop)}>
          Редактирование тега
        </span>
        <div className={tagStyles.tagEditInputGroup}>
          <div className={tagStyles.tagEditInputWrapper}>
            <input
              type="text"
              className={tagStyles.tagEditInput}
              placeholder="Введите новое название"
              value={editName}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <TagColorPicker selected={editColor} onPick={onColorChange} />
        </div>
        <div className={tagStyles.tagEditActions}>
          <button
            type="button"
            className={tagStyles.tagEditDeleteBtn}
            onClick={onDelete}
            aria-label="Удалить тег"
          >
            <TrashIcon width={15} height={16.67} color="#B0B4B8" />
            <span className={tagStyles.tagEditDeleteText}>Удалить тег</span>
          </button>
          <Button
            onClick={onSave}
            size="sm"
            className={tagStyles.tagEditSaveBtn}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
