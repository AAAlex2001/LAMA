'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface DatePickerContextValue {
  selectedDate: Date | null;
  isOpen: boolean;
  hours: number;
  minutes: number;
  setSelectedDate: (date: Date | null) => void;
  setHours: (hours: number) => void;
  setMinutes: (minutes: number) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null);

interface DatePickerProviderProps {
  children: ReactNode;
}

export function DatePickerProvider({ children }: DatePickerProviderProps) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState(currentHours);
  const [minutes, setMinutes] = useState(currentMinutes);

  const open = () => {
    setIsOpen(true);
  };
  
  const close = () => {
    setIsOpen(false);
  };
  
  const toggle = () => {
    setIsOpen(!isOpen);
  };

  const value: DatePickerContextValue = {
    selectedDate,
    isOpen,
    hours,
    minutes,
    setSelectedDate,
    setHours,
    setMinutes,
    open,
    close,
    toggle,
  };

  return (
    <DatePickerContext.Provider value={value}>
      {children}
    </DatePickerContext.Provider>
  );
}

export function useDatePicker() {
  const context = useContext(DatePickerContext);
  if (!context) {
    throw new Error('useDatePicker must be used within DatePickerProvider');
  }
  return context;
}
