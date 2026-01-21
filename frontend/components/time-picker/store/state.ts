import { TimePickerState } from './types';

export const initialState: TimePickerState = {
  hours: 12,
  minutes: 0,
  isEditingHours: false,
  isEditingMinutes: false,
  inputHours: '',
  inputMinutes: '',
  selectedDate: null,
};
