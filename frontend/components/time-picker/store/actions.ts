import { TimePickerAction } from './types';

export const setHours = (hours: number): TimePickerAction => ({
  type: 'SET_HOURS',
  payload: hours,
});

export const setMinutes = (minutes: number): TimePickerAction => ({
  type: 'SET_MINUTES',
  payload: minutes,
});

export const setSelectedDate = (date: Date | null): TimePickerAction => ({
  type: 'SET_SELECTED_DATE',
  payload: date,
});

export const startEditingHours = (): TimePickerAction => ({
  type: 'START_EDITING_HOURS',
});

export const startEditingMinutes = (): TimePickerAction => ({
  type: 'START_EDITING_MINUTES',
});

export const setInputHours = (value: string): TimePickerAction => ({
  type: 'SET_INPUT_HOURS',
  payload: value,
});

export const setInputMinutes = (value: string): TimePickerAction => ({
  type: 'SET_INPUT_MINUTES',
  payload: value,
});

export const finishEditingHours = (): TimePickerAction => ({
  type: 'FINISH_EDITING_HOURS',
});

export const finishEditingMinutes = (): TimePickerAction => ({
  type: 'FINISH_EDITING_MINUTES',
});

export const cancelEditingHours = (): TimePickerAction => ({
  type: 'CANCEL_EDITING_HOURS',
});

export const cancelEditingMinutes = (): TimePickerAction => ({
  type: 'CANCEL_EDITING_MINUTES',
});
