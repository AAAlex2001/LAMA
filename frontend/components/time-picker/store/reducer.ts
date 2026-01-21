import { TimePickerState, TimePickerAction } from './types';

export function timePickerReducer(
  state: TimePickerState,
  action: TimePickerAction
): TimePickerState {
  switch (action.type) {
    case 'SET_HOURS':
      return { ...state, hours: action.payload };
    
    case 'SET_MINUTES':
      return { ...state, minutes: action.payload };
    
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    
    case 'START_EDITING_HOURS':
      return {
        ...state,
        isEditingHours: true,
        inputHours: state.hours.toString().padStart(2, '0'),
      };
    
    case 'START_EDITING_MINUTES':
      return {
        ...state,
        isEditingMinutes: true,
        inputMinutes: state.minutes.toString().padStart(2, '0'),
      };
    
    case 'SET_INPUT_HOURS':
      return { ...state, inputHours: action.payload };
    
    case 'SET_INPUT_MINUTES':
      return { ...state, inputMinutes: action.payload };
    
    case 'FINISH_EDITING_HOURS':
      return { ...state, isEditingHours: false };
    
    case 'FINISH_EDITING_MINUTES':
      return { ...state, isEditingMinutes: false };
    
    case 'CANCEL_EDITING_HOURS':
      return { ...state, isEditingHours: false, inputHours: '' };
    
    case 'CANCEL_EDITING_MINUTES':
      return { ...state, isEditingMinutes: false, inputMinutes: '' };
    
    default:
      return state;
  }
}
