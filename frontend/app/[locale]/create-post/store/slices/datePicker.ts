import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DatePickerState {
  selectedDate: Date | null;
  hours: number;
  minutes: number;
}

const initialState: DatePickerState = {
  selectedDate: null,
  hours: new Date().getHours(),
  minutes: new Date().getMinutes(),
};

const datePickerSlice = createSlice({
  name: 'datePicker',
  initialState,
  reducers: {
    setSelectedDate: (state, action: PayloadAction<Date | null>) => {
      state.selectedDate = action.payload;
    },
    setHours: (state, action: PayloadAction<number>) => {
      state.hours = action.payload;
    },
    setMinutes: (state, action: PayloadAction<number>) => {
      state.minutes = action.payload;
    },
    resetDatePicker: (state) => {
      state.selectedDate = null;
      state.hours = new Date().getHours();
      state.minutes = new Date().getMinutes();
    },
  },
});

export const {
  setSelectedDate,
  setHours,
  setMinutes,
  resetDatePicker,
} = datePickerSlice.actions;

export default datePickerSlice.reducer;
