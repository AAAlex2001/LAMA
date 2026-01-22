'use client';

import { useState } from 'react';
import type { RepeatContentProps } from '../../types';
import RepeatDefaultCase from './components/RepeatDefaultCase';
import RepeatDailyCase from './components/RepeatDailyCase';
import RepeatCustomCase from './components/RepeatCustomCase';

export type RepeatViewMode = 'list' | 'daily' | 'custom';

interface RepeatContentPropsExtended extends RepeatContentProps {
  viewMode: RepeatViewMode;
  onViewModeChange: (mode: RepeatViewMode) => void;
  publishHours?: number;
  publishMinutes?: number;
  onPublishHoursChange?: (hours: number) => void;
  onPublishMinutesChange?: (minutes: number) => void;
}

export default function RepeatContent({
  repeatValue,
  onRepeatChange,
  viewMode,
  onViewModeChange,
  publishHours = 12,
  publishMinutes = 0,
  onPublishHoursChange,
  onPublishMinutesChange,
}: RepeatContentPropsExtended) {
  // Local state for hours/minutes if not controlled externally
  const [localHours, setLocalHours] = useState(publishHours);
  const [localMinutes, setLocalMinutes] = useState(publishMinutes);
  
  // Local state for repeat end
  const [repeatEndType, setRepeatEndType] = useState<'never' | 'date'>('never');
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);

  const handleHoursChange = (hours: number) => {
    setLocalHours(hours);
    onPublishHoursChange?.(hours);
  };

  const handleMinutesChange = (minutes: number) => {
    setLocalMinutes(minutes);
    onPublishMinutesChange?.(minutes);
  };

  const handleBack = () => {
    // Reset to 'never' when going back
    onRepeatChange?.('never');
    onViewModeChange('list');
  };

  if (viewMode === 'daily') {
    return (
      <RepeatDailyCase
        onBack={handleBack}
        publishHours={localHours}
        publishMinutes={localMinutes}
        onPublishHoursChange={handleHoursChange}
        onPublishMinutesChange={handleMinutesChange}
        repeatEndType={repeatEndType}
        onRepeatEndTypeChange={setRepeatEndType}
        repeatEndDate={repeatEndDate}
        onRepeatEndDateChange={setRepeatEndDate}
      />
    );
  }

  if (viewMode === 'custom') {
    return <RepeatCustomCase onBack={handleBack} />;
  }

  return (
    <RepeatDefaultCase
      repeatValue={repeatValue}
      onRepeatChange={(value) => {
        onRepeatChange?.(value);
        if (value === 'daily') {
          onViewModeChange('daily');
        }
      }}
      onCustomClick={() => onViewModeChange('custom')}
    />
  );
}
