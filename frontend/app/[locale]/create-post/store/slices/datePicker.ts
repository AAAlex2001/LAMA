import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DatePickerState {
  selectedDate: Date | null;
  hours: number;
  minutes: number;
}

const now = new Date();
now.setHours(0, 0, 0, 0);

const initialState: DatePickerState = {
  selectedDate: now,
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
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      state.selectedDate = now;
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
