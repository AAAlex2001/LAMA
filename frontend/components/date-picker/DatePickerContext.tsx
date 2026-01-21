'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface DatePickerContextValue {
  // State
  selectedDate: Date | null;
  isOpen: boolean;
  hours: number;
  minutes: number;
  
  // Actions
  setSelectedDate: (date: Date | null) => void;
  setHours: (hours: number) => void;
  setMinutes: (minutes: number) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  schedulePost: () => void;
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null);

interface DatePickerProviderProps {
  children: ReactNode;
  onSchedule?: (scheduledDate: Date) => void | Promise<void>;
}

export function DatePickerProvider({ children, onSchedule }: DatePickerProviderProps) {
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

  const schedulePost = async () => {
    if (selectedDate) {
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(hours, minutes, 0, 0);
      setSelectedDate(scheduledDateTime);
      
      if (onSchedule) {
        await onSchedule(scheduledDateTime);
      }
      
      close();
    }
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
    schedulePost,
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
