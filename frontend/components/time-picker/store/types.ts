export interface TimePickerState {
  hours: number;
  minutes: number;
  isEditingHours: boolean;
  isEditingMinutes: boolean;
  inputHours: string;
  inputMinutes: string;
  selectedDate: Date | null;
}

export type TimePickerAction =
  | { type: 'SET_HOURS'; payload: number }
  | { type: 'SET_MINUTES'; payload: number }
  | { type: 'SET_SELECTED_DATE'; payload: Date | null }
  | { type: 'START_EDITING_HOURS' }
  | { type: 'START_EDITING_MINUTES' }
  | { type: 'SET_INPUT_HOURS'; payload: string }
  | { type: 'SET_INPUT_MINUTES'; payload: string }
  | { type: 'FINISH_EDITING_HOURS' }
  | { type: 'FINISH_EDITING_MINUTES' }
  | { type: 'CANCEL_EDITING_HOURS' }
  | { type: 'CANCEL_EDITING_MINUTES' };
