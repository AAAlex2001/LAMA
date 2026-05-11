'use client';
import type { RepeatContentProps } from './types';
import RepeatDefaultCase from './components/RepeatDefaultCase';
import RepeatDailyCase from './components/RepeatDailyCase';
import RepeatCustomCase from './components/RepeatCustomCase';

export type RepeatViewMode = 'list' | 'daily' | 'custom';

interface RepeatContentPropsExtended extends RepeatContentProps {
  viewMode: RepeatViewMode;
  onViewModeChange: (mode: RepeatViewMode) => void;
  repeatEndType: 'never' | 'date';
  repeatEndDate: Date | null;
  scheduledMinDate?: Date | null;
  onRepeatEndTypeChange?: (value: 'never' | 'date') => void;
  onRepeatEndDateChange?: (value: Date | null) => void;
}

export default function RepeatContent({
  repeatValue,
  repeatPublishTimeType,
  repeatPublishHours,
  repeatPublishMinutes,
  onRepeatPublishTimeTypeChange,
  onRepeatPublishHoursChange,
  onRepeatPublishMinutesChange,
  repeatCustomDays,
  repeatCustomHours,
  repeatCustomUnit,
  repeatCustomValue,
  repeatWeekdays,
  repeatMonthDays,
  repeatYearMonth,
  repeatYearDays,
  onRepeatChange,
  onRepeatCustomDaysChange,
  onRepeatCustomHoursChange,
  onRepeatCustomUnitChange,
  onRepeatCustomValueChange,
  onRepeatWeekdaysChange,
  onRepeatMonthDaysChange,
  onRepeatYearMonthChange,
  onRepeatYearDaysChange,
  viewMode,
  onViewModeChange,
  repeatEndType,
  repeatEndDate,
  scheduledMinDate,
  onRepeatEndTypeChange,
  onRepeatEndDateChange,
}: RepeatContentPropsExtended) {
  const effectivePublishTimeType = repeatPublishTimeType ?? 'from_publish';
  const effectivePublishHours = repeatPublishHours ?? 12;
  const effectivePublishMinutes = repeatPublishMinutes ?? 0;

  if (viewMode === 'daily') {
    return (
      <RepeatDailyCase
        repeatValue={repeatValue}
        onRepeatChange={(value) => {
          onRepeatChange?.(value);
          if (value === 'never') {
            onViewModeChange('list');
          }
        }}
        publishTimeType={effectivePublishTimeType}
        onPublishTimeTypeChange={onRepeatPublishTimeTypeChange}
        publishHours={effectivePublishHours}
        publishMinutes={effectivePublishMinutes}
        onPublishHoursChange={onRepeatPublishHoursChange}
        onPublishMinutesChange={onRepeatPublishMinutesChange}
        repeatEndType={repeatEndType}
        onRepeatEndTypeChange={(value) => {
          onRepeatEndTypeChange?.(value);
        }}
        repeatEndDate={repeatEndDate}
        scheduledMinDate={scheduledMinDate ?? undefined}
        onRepeatEndDateChange={(date) => {
          onRepeatEndDateChange?.(date);
        }}
        onCustomClick={() => {
          onRepeatChange?.('custom');
          onViewModeChange('custom');
        }}
      />
    );
  }

  if (viewMode === 'custom') {
    return (
      <RepeatCustomCase
        repeatCustomDays={repeatCustomDays}
        repeatCustomHours={repeatCustomHours}
        repeatCustomUnit={repeatCustomUnit}
        repeatCustomValue={repeatCustomValue}
        repeatWeekdays={repeatWeekdays}
        repeatMonthDays={repeatMonthDays}
        repeatYearMonth={repeatYearMonth}
        repeatYearDays={repeatYearDays}
        onRepeatCustomDaysChange={onRepeatCustomDaysChange}
        onRepeatCustomHoursChange={onRepeatCustomHoursChange}
        onRepeatCustomUnitChange={onRepeatCustomUnitChange}
        onRepeatCustomValueChange={onRepeatCustomValueChange}
        onRepeatWeekdaysChange={onRepeatWeekdaysChange}
        onRepeatMonthDaysChange={onRepeatMonthDaysChange}
        onRepeatYearMonthChange={onRepeatYearMonthChange}
        onRepeatYearDaysChange={onRepeatYearDaysChange}
        repeatEndType={repeatEndType}
        repeatEndDate={repeatEndDate}
        scheduledMinDate={scheduledMinDate ?? undefined}
        onRepeatEndTypeChange={onRepeatEndTypeChange}
        onRepeatEndDateChange={onRepeatEndDateChange}
        onRepeatOptionChange={(value) => {
          onRepeatChange?.(value);
          if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly') {
            onViewModeChange('daily');
          } else if (value === 'never') {
            onViewModeChange('list');
          }
        }}
      />
    );
  }

  return (
    <RepeatDefaultCase
      repeatValue={repeatValue}
      onRepeatChange={(value) => {
        onRepeatChange?.(value);
        if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly') {
          onViewModeChange('daily');
        }
      }}
      onCustomClick={() => {
        onRepeatChange?.('custom');
        onViewModeChange('custom');
      }}
    />
  );
}
