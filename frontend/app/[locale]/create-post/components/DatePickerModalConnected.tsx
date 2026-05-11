'use client';

import { DatePickerModal } from '@/components/date-picker';
import { useAppDispatch, useAppSelector } from '../store';
import { useSelectedChannels } from '../hooks/useSelectedChannels';
import * as datePickerSlice from '../store/slices/datePicker';
import * as uiSlice from '../store/slices/ui';
import { schedulePost } from '../store/thunks';
import { useNotifications } from '@/components/notifications/NotificationProvider';

interface DatePickerModalConnectedProps {
  redirectToDraftsOnSuccess?: boolean;
}

export default function DatePickerModalConnected({ redirectToDraftsOnSuccess = false }: DatePickerModalConnectedProps) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const isOpen = useAppSelector(state => state.ui.showDatePickerModal);
  const datePickerState = useAppSelector(state => state.datePicker);
  const isScheduling = useAppSelector(state => state.ui.isScheduling);

  const selectedChannels = useSelectedChannels();

  const handleSchedule = async (scheduledDate: Date) => {
    try {
      const result = await dispatch(schedulePost({
        channelIds: selectedChannels.map(c => c.id),
        scheduledDate,
      })).unwrap();
      showSuccess(result?.message || 'Пост запланирован');
      dispatch(uiSlice.setShowDatePickerModal(false));
      dispatch(datePickerSlice.resetDatePicker());

      if (redirectToDraftsOnSuccess) {
        setTimeout(() => {
          window.location.href = '/drafts';
        }, 3000);
      }
    } catch (err) {
      showError(typeof err === 'string' ? err : 'Ошибка планирования');
    }
  };

  return (
    <DatePickerModal
      isOpen={isOpen}
      selectedDate={datePickerState.selectedDate}
      hours={datePickerState.hours}
      minutes={datePickerState.minutes}
      onDateChange={(date) => dispatch(datePickerSlice.setSelectedDate(date))}
      onHoursChange={(h) => dispatch(datePickerSlice.setHours(h))}
      onMinutesChange={(m) => dispatch(datePickerSlice.setMinutes(m))}
      onSchedule={handleSchedule}
      onClose={() => dispatch(uiSlice.setShowDatePickerModal(false))}
      isLoading={isScheduling}
    />
  );
}
