'use client';

import React, { createContext, useContext, useReducer, useRef, useEffect, type ReactNode } from 'react';
import { TimePickerState, TimePickerAction } from './types';
import { timePickerReducer } from './reducer';
import { initialState } from './state';
import * as actions from './actions';

interface TimePickerContextValue {
  state: TimePickerState;
  dispatch: React.Dispatch<TimePickerAction>;
  hoursColRef: React.RefObject<HTMLDivElement>;
  minutesColRef: React.RefObject<HTMLDivElement>;
  isDragging: React.MutableRefObject<'hours' | 'minutes' | null>;
  startY: React.MutableRefObject<number>;
  startValue: React.MutableRefObject<number>;
  actions: typeof actions;
  handlers: {
    handleHoursClick: () => void;
    handleMinutesClick: () => void;
    handleHoursInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleMinutesInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleHoursInputBlur: () => void;
    handleMinutesInputBlur: () => void;
    handleHoursInputKeyDown: (e: React.KeyboardEvent) => void;
    handleMinutesInputKeyDown: (e: React.KeyboardEvent) => void;
    handleMouseDown: (e: React.MouseEvent, type: 'hours' | 'minutes') => void;
    handleTouchStart: (e: React.TouchEvent, type: 'hours' | 'minutes') => void;
    handleTouchMove: (e: React.TouchEvent) => void;
    handleTouchEnd: () => void;
  };
  utils: {
    formatValue: (val: number) => string;
    clampHours: (val: number) => number;
    clampMinutes: (val: number) => number;
    getPrevHours: () => number | null;
    getNextHours: () => number | null;
    getPrevMinutes: () => number | null;
    getNextMinutes: () => number | null;
  };
}

const TimePickerContext = createContext<TimePickerContextValue | null>(null);

interface TimePickerProviderProps {
  children: ReactNode;
  initialHours?: number;
  initialMinutes?: number;
  selectedDate?: Date | null;
  onHoursChange?: (hours: number) => void;
  onMinutesChange?: (minutes: number) => void;
}

export function TimePickerProvider({
  children,
  initialHours = 12,
  initialMinutes = 0,
  selectedDate = null,
  onHoursChange,
  onMinutesChange,
}: TimePickerProviderProps) {
  const [state, dispatch] = useReducer(timePickerReducer, {
    ...initialState,
    hours: initialHours,
    minutes: initialMinutes,
    selectedDate,
  });

  const hoursColRef = useRef<HTMLDivElement>(null);
  const minutesColRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<'hours' | 'minutes' | null>(null);
  const startY = useRef(0);
  const startValue = useRef(0);

  const now = new Date();
  const isToday = state.selectedDate
    ? state.selectedDate.getDate() === now.getDate() &&
      state.selectedDate.getMonth() === now.getMonth() &&
      state.selectedDate.getFullYear() === now.getFullYear()
    : false;

  const minHours = isToday ? now.getHours() : 0;
  const minMinutes = isToday && state.hours === now.getHours() ? now.getMinutes() : 0;

  const formatValue = (val: number): string => val.toString().padStart(2, '0');

  const clampHours = (val: number): number => {
    if (isToday && val < minHours) return minHours;
    if (val < 0) return minHours;
    if (val > 23) return 23;
    return val;
  };

  const clampMinutes = (val: number): number => {
    if (isToday && state.hours === now.getHours() && val < minMinutes) return minMinutes;
    if (val < 0) return 0;
    if (val > 59) return 59;
    return val;
  };

  const getPrevHours = (): number | null => {
    const prev = state.hours - 1;
    if (prev < 0) return null; // нет предыдущего значения после 0
    if (isToday && prev < minHours) return null;
    return prev;
  };

  const getNextHours = (): number | null => {
    const next = state.hours + 1;
    if (next > 23) return null; // нет следующего значения после 23
    return next;
  };

  const getPrevMinutes = (): number | null => {
    const prev = state.minutes - 1;
    if (prev < 0) return null; // нет предыдущего значения после 0
    if (isToday && state.hours === now.getHours() && prev < minMinutes) return null;
    return prev;
  };

  const getNextMinutes = (): number | null => {
    const next = state.minutes + 1;
    if (next > 59) return null; // нет следующего значения после 59
    return next;
  };

  const handleHoursClick = () => {
    dispatch(actions.startEditingHours());
  };

  const handleMinutesClick = () => {
    dispatch(actions.startEditingMinutes());
  };

  const handleHoursInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 2) {
      dispatch(actions.setInputHours(value));
    }
  };

  const handleMinutesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 2) {
      dispatch(actions.setInputMinutes(value));
    }
  };

  const handleHoursInputBlur = () => {
    const value = parseInt(state.inputHours, 10);
    if (!isNaN(value) && value >= 0 && value <= 23) {
      const clamped = clampHours(value);
      dispatch(actions.setHours(clamped));
      onHoursChange?.(clamped);
    }
    dispatch(actions.finishEditingHours());
  };

  const handleMinutesInputBlur = () => {
    const value = parseInt(state.inputMinutes, 10);
    if (!isNaN(value) && value >= 0 && value <= 59) {
      const clamped = clampMinutes(value);
      dispatch(actions.setMinutes(clamped));
      onMinutesChange?.(clamped);
    }
    dispatch(actions.finishEditingMinutes());
  };

  const handleHoursInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHoursInputBlur();
    } else if (e.key === 'Escape') {
      dispatch(actions.cancelEditingHours());
    }
  };

  const handleMinutesInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleMinutesInputBlur();
    } else if (e.key === 'Escape') {
      dispatch(actions.cancelEditingMinutes());
    }
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'hours' | 'minutes') => {
    e.preventDefault();
    isDragging.current = type;
    startY.current = e.clientY;
    startValue.current = type === 'hours' ? state.hours : state.minutes;
    document.body.style.userSelect = 'none';
  };

  const handleTouchStart = (e: React.TouchEvent, type: 'hours' | 'minutes') => {
    isDragging.current = type;
    startY.current = e.touches[0].clientY;
    startValue.current = type === 'hours' ? state.hours : state.minutes;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;

    const deltaY = startY.current - e.touches[0].clientY;
    const steps = Math.round(deltaY / 24);

    if (isDragging.current === 'hours') {
      const newValue = clampHours(startValue.current + steps);
      if (newValue !== state.hours) {
        dispatch(actions.setHours(newValue));
        onHoursChange?.(newValue);
      }
    } else {
      const newValue = clampMinutes(startValue.current + steps);
      if (newValue !== state.minutes) {
        dispatch(actions.setMinutes(newValue));
        onMinutesChange?.(newValue);
      }
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = null;
  };

  useEffect(() => {
    const hoursEl = hoursColRef.current;
    const minutesEl = minutesColRef.current;

    const handleHoursWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      const newValue = clampHours(state.hours - delta);
      dispatch(actions.setHours(newValue));
      onHoursChange?.(newValue);
    };

    const handleMinutesWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      const newValue = clampMinutes(state.minutes - delta);
      dispatch(actions.setMinutes(newValue));
      onMinutesChange?.(newValue);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      const deltaY = startY.current - e.clientY;
      const steps = Math.round(deltaY / 24);

      if (isDragging.current === 'hours') {
        const newValue = clampHours(startValue.current + steps);
        if (newValue !== state.hours) {
          dispatch(actions.setHours(newValue));
          onHoursChange?.(newValue);
        }
      } else {
        const newValue = clampMinutes(startValue.current + steps);
        if (newValue !== state.minutes) {
          dispatch(actions.setMinutes(newValue));
          onMinutesChange?.(newValue);
        }
      }
    };

    const handleMouseUp = () => {
      isDragging.current = null;
      document.body.style.userSelect = '';
    };

    hoursEl?.addEventListener('wheel', handleHoursWheel, { passive: false });
    minutesEl?.addEventListener('wheel', handleMinutesWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      hoursEl?.removeEventListener('wheel', handleHoursWheel);
      minutesEl?.removeEventListener('wheel', handleMinutesWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [state.hours, state.minutes, onHoursChange, onMinutesChange]);

  // Синхронизация минут при изменении часов (если минуты стали невалидными)
  useEffect(() => {
    if (isToday && state.hours === now.getHours() && state.minutes < minMinutes) {
      dispatch(actions.setMinutes(minMinutes));
      onMinutesChange?.(minMinutes);
    }
  }, [state.hours]);

  useEffect(() => {
    if (selectedDate !== state.selectedDate) {
      dispatch(actions.setSelectedDate(selectedDate));
    }
  }, [selectedDate]);

  const value: TimePickerContextValue = {
    state,
    dispatch,
    hoursColRef,
    minutesColRef,
    isDragging,
    startY,
    startValue,
    actions,
    handlers: {
      handleHoursClick,
      handleMinutesClick,
      handleHoursInputChange,
      handleMinutesInputChange,
      handleHoursInputBlur,
      handleMinutesInputBlur,
      handleHoursInputKeyDown,
      handleMinutesInputKeyDown,
      handleMouseDown,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
    },
    utils: {
      formatValue,
      clampHours,
      clampMinutes,
      getPrevHours,
      getNextHours,
      getPrevMinutes,
      getNextMinutes,
    },
  };

  return (
    <TimePickerContext.Provider value={value}>
      {children}
    </TimePickerContext.Provider>
  );
}

export function useTimePicker() {
  const context = useContext(TimePickerContext);
  if (!context) {
    throw new Error('useTimePicker must be used within TimePickerProvider');
  }
  return context;
}
