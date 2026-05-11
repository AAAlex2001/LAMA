'use client';

import classNames from 'classnames';
import { TAG_COLORS } from '@/types';
import type { TagColor } from '@/types';
import tagStyles from '../../tags.module.scss';

interface Props {
  selected: TagColor;
  onPick: (color: TagColor) => void;
}

export default function TagColorPicker({ selected, onPick }: Props) {
  return (
    <div className={tagStyles.tagColorPicker}>
      {TAG_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={classNames(tagStyles.tagColorButton, {
            [tagStyles.tagColorButtonSelected]: selected === color,
          })}
          style={{ backgroundColor: color }}
          onClick={() => onPick(color)}
        />
      ))}
    </div>
  );
}
