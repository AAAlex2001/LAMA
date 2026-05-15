'use client';

import { PlusIcon } from '@/components/icons';
import type { TagColor } from '@/types';
import TagColorPicker from './TagColorPicker';
import tagStyles from '../../tags.module.scss';

interface Props {
  inputValue: string;
  selectedColor: TagColor;
  onInputChange: (value: string) => void;
  onColorChange: (color: TagColor) => void;
  onAdd: () => void;
}

export default function TagCreateRow({
  inputValue,
  selectedColor,
  onInputChange,
  onColorChange,
  onAdd,
}: Props) {
  return (
    <div className={tagStyles.tagCreateSection}>
      <div className={tagStyles.tagInputWrapper}>
        <input
          type="text"
          className={tagStyles.tagCreateInput}
          placeholder="Введите название тега"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }}
        />
        <TagColorPicker selected={selectedColor} onPick={onColorChange} />
      </div>
      <button type="button" className={tagStyles.addTagBtn} onClick={onAdd}>
        <PlusIcon width={16} height={16} color="#3B82F6" />
      </button>
    </div>
  );
}
