'use client';

import { CloseIcon, SettingsIcon } from '@/components/icons';
import { useAppDispatch, useAppSelector } from '../store';
import * as settingsSlice from '../store/slices/settings';
import * as uiSlice from '../store/slices/ui';

interface EditorHeaderConnectedProps {
  className?: string;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  tagClassName?: string;
  tagButtonClassName?: string;
  tagTextClassName?: string;
  tagCloseClassName?: string;
  settingsButtonClassName?: string;
}

export default function EditorHeaderConnected({
  className,
  headerRef,
  tagClassName,
  tagButtonClassName,
  tagTextClassName,
  tagCloseClassName,
  settingsButtonClassName,
}: EditorHeaderConnectedProps) {
  const dispatch = useAppDispatch();

  const selectedTagName = useAppSelector(state => state.settings.selectedTagName);
  const selectedTagColor = useAppSelector(state => state.settings.selectedTagColor);
  const showMobileSettings = useAppSelector(state => state.ui.showMobileSettings);

  return (
    <div className={className} ref={headerRef}>
      <div className={tagClassName}>
        {selectedTagName && (
          <div className={tagButtonClassName} style={{ backgroundColor: selectedTagColor }}>
            <span className={tagTextClassName}>{selectedTagName}</span>
            <button
              type="button"
              className={tagCloseClassName}
              onClick={() => dispatch(settingsSlice.clearTag())}
              aria-label="Удалить тег"
            >
              <CloseIcon width={12} height={12} color="#000000" />
            </button>
          </div>
        )}
      </div>
      <button
        className={settingsButtonClassName}
        type="button"
        aria-label="Настройки"
        onClick={() => dispatch(uiSlice.setShowMobileSettings(!showMobileSettings))}
      >
        <SettingsIcon width={24} height={24} />
      </button>
    </div>
  );
}
