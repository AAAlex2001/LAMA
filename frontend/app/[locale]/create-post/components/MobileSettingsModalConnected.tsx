'use client';

import { useAppDispatch, useAppSelector } from '../store';
import * as uiSlice from '../store/slices/ui';
import { PostSettingsConnected } from './';

interface MobileSettingsModalConnectedProps {
  overlayClassName?: string;
  modalClassName?: string;
  onPreview: () => void;
  previewDisabled: boolean;
}

export default function MobileSettingsModalConnected({
  overlayClassName,
  modalClassName,
  onPreview,
  previewDisabled,
}: MobileSettingsModalConnectedProps) {
  const dispatch = useAppDispatch();
  const showMobileSettings = useAppSelector(state => state.ui.showMobileSettings);

  if (!showMobileSettings) return null;

  return (
    <div className={overlayClassName} onClick={() => dispatch(uiSlice.setShowMobileSettings(false))}>
      <div className={modalClassName} onClick={e => e.stopPropagation()}>
        <PostSettingsConnected
          onPreview={onPreview}
          previewDisabled={previewDisabled}
        />
      </div>
    </div>
  );
}
