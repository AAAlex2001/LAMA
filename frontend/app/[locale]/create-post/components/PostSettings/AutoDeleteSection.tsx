'use client';

import { FC } from 'react';
import AutoDeletePicker from '@/components/auto-delete-picker';
import { useAppDispatch, useAppSelector } from '../../store';
import * as settingsSlice from '../../store/slices/settings';
import type { AutoDeleteOption } from '../../store/types';

interface AutoDeleteSectionProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

const AutoDeleteSection: FC<AutoDeleteSectionProps> = ({ isOpen, onToggle }) => {
  const dispatch = useAppDispatch();
  const interval = useAppSelector((s) => s.settings.autoDeleteInterval);
  const customDays = useAppSelector((s) => s.settings.autoDeleteCustomDays);
  const customHours = useAppSelector((s) => s.settings.autoDeleteCustomHours);

  return (
    <AutoDeletePicker
      label="Автоудаление поста"
      autoDeleteValue={interval}
      onAutoDeleteChange={(v: AutoDeleteOption) => dispatch(settingsSlice.setAutoDeleteInterval(v))}
      autoDeleteCustomDays={customDays}
      autoDeleteCustomHours={customHours}
      onAutoDeleteCustomDaysChange={(v) => dispatch(settingsSlice.setAutoDeleteCustomDays(v))}
      onAutoDeleteCustomHoursChange={(v) => dispatch(settingsSlice.setAutoDeleteCustomHours(v))}
      isOpen={isOpen}
      onToggle={onToggle}
      closeOnOutsideClick={false}
    />
  );
};

export default AutoDeleteSection;
