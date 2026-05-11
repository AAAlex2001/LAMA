'use client';

import { FC } from 'react';
import RepeatSettings from '@/components/repeat-settings';
import { useAppDispatch, useAppSelector } from '../../store';
import * as settingsSlice from '../../store/slices/settings';
import type { RepeatOption, RepeatCustomUnit } from '../../store/types';

interface RepeatSectionProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

const RepeatSection: FC<RepeatSectionProps> = ({ isOpen, onToggle }) => {
  const dispatch = useAppDispatch();

  const repeatInterval = useAppSelector((s) => s.settings.repeatInterval);
  const repeatPublishTimeType = useAppSelector((s) => s.settings.repeatPublishTimeType);
  const repeatPublishHours = useAppSelector((s) => s.settings.repeatPublishHours);
  const repeatPublishMinutes = useAppSelector((s) => s.settings.repeatPublishMinutes);
  const repeatCustomDays = useAppSelector((s) => s.settings.repeatCustomDays);
  const repeatCustomHours = useAppSelector((s) => s.settings.repeatCustomHours);
  const repeatCustomUnit = useAppSelector((s) => s.settings.repeatCustomUnit);
  const repeatCustomValue = useAppSelector((s) => s.settings.repeatCustomValue);
  const repeatWeekdays = useAppSelector((s) => s.settings.repeatWeekdays);
  const repeatMonthDays = useAppSelector((s) => s.settings.repeatMonthDays);
  const repeatYearMonth = useAppSelector((s) => s.settings.repeatYearMonth);
  const repeatYearDays = useAppSelector((s) => s.settings.repeatYearDays);
  const repeatEndType = useAppSelector((s) => s.settings.repeatEndType);
  const repeatEndDate = useAppSelector((s) => s.settings.repeatEndDate);
  const scheduledDate = useAppSelector((s) => s.datePicker.selectedDate);

  return (
    <RepeatSettings
      label="Повтор"
      repeatValue={repeatInterval}
      repeatPublishTimeType={repeatPublishTimeType}
      repeatPublishHours={repeatPublishHours}
      repeatPublishMinutes={repeatPublishMinutes}
      onRepeatChange={(v: RepeatOption) => dispatch(settingsSlice.setRepeatInterval(v))}
      onRepeatPublishTimeTypeChange={(v) => dispatch(settingsSlice.setRepeatPublishTimeType(v))}
      onRepeatPublishHoursChange={(v) => dispatch(settingsSlice.setRepeatPublishHours(v))}
      onRepeatPublishMinutesChange={(v) => dispatch(settingsSlice.setRepeatPublishMinutes(v))}
      repeatCustomDays={repeatCustomDays}
      repeatCustomHours={repeatCustomHours}
      repeatCustomUnit={repeatCustomUnit}
      repeatCustomValue={repeatCustomValue}
      repeatWeekdays={repeatWeekdays}
      repeatMonthDays={repeatMonthDays}
      repeatYearMonth={repeatYearMonth}
      repeatYearDays={repeatYearDays}
      repeatEndType={repeatEndType}
      repeatEndDate={repeatEndDate ? new Date(repeatEndDate) : null}
      scheduledMinDate={scheduledDate}
      onRepeatCustomDaysChange={(v) => dispatch(settingsSlice.setRepeatCustomDays(v))}
      onRepeatCustomHoursChange={(v) => dispatch(settingsSlice.setRepeatCustomHours(v))}
      onRepeatCustomUnitChange={(v: RepeatCustomUnit) => dispatch(settingsSlice.setRepeatCustomUnit(v))}
      onRepeatCustomValueChange={(v) => dispatch(settingsSlice.setRepeatCustomValue(v))}
      onRepeatWeekdaysChange={(v) => dispatch(settingsSlice.setRepeatWeekdays(v))}
      onRepeatMonthDaysChange={(v) => dispatch(settingsSlice.setRepeatMonthDays(v))}
      onRepeatYearMonthChange={(v) => dispatch(settingsSlice.setRepeatYearMonth(v))}
      onRepeatYearDaysChange={(v) => dispatch(settingsSlice.setRepeatYearDays(v))}
      onRepeatEndTypeChange={(v) => {
        dispatch(settingsSlice.setRepeatEndType(v));
        if (v === 'date' && !repeatEndDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const minDate = scheduledDate && scheduledDate > today ? scheduledDate : today;
          dispatch(settingsSlice.setRepeatEndDate(minDate.toISOString()));
        }
      }}
      onRepeatEndDateChange={(v) => dispatch(settingsSlice.setRepeatEndDate(v?.toISOString() ?? null))}
      isOpen={isOpen}
      onToggle={onToggle}
      closeOnOutsideClick={false}
    />
  );
};

export default RepeatSection;
