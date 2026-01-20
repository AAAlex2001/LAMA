'use client';

import React, { createContext, useContext, useReducer, useState, type ReactNode } from 'react';
import { quizFormReducer, initialQuizFormState } from './store/reducer';
import { selectPollData } from './store/selectors';
import type { QuizFormState, QuizFormMode } from './store/types';
import type { PollData } from './store/selectors';

interface QuizFormContextValue {
  // State
  state: QuizFormState;
  isOpen: boolean;
  
  // Actions
  setMode: (mode: QuizFormMode) => void;
  setQuestion: (question: string) => void;
  setAnswerText: (id: string, text: string) => void;
  addAnswer: () => void;
  removeAnswer: (id: string) => void;
  setCorrectAnswer: (id: string | null) => void;
  reset: () => void;
  
  // Toggle visibility
  open: () => void;
  close: () => void;
  toggle: () => void;
  
  // Selectors
  getPollData: () => PollData | null;
}

const QuizFormContext = createContext<QuizFormContextValue | null>(null);

interface QuizFormProviderProps {
  children: ReactNode;
  initialOpen?: boolean;
}

export function QuizFormProvider({ children, initialOpen = false }: QuizFormProviderProps) {
  const [state, dispatch] = useReducer(quizFormReducer, initialQuizFormState);
  const [isOpen, setIsOpen] = useState(initialOpen);

  // Actions
  const setMode = (mode: QuizFormMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  };

  const setQuestion = (question: string) => {
    dispatch({ type: 'SET_QUESTION', payload: question });
  };

  const setAnswerText = (id: string, text: string) => {
    dispatch({ type: 'SET_ANSWER_TEXT', payload: { id, text } });
  };

  const addAnswer = () => {
    dispatch({ type: 'ADD_ANSWER' });
  };

  const removeAnswer = (id: string) => {
    dispatch({ type: 'REMOVE_ANSWER', payload: { id } });
  };

  const setCorrectAnswer = (id: string | null) => {
    dispatch({ type: 'SET_CORRECT_ANSWER', payload: { id } });
  };

  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  // Toggle visibility
  const open = () => setIsOpen(true);
  
  const close = () => {
    setIsOpen(false);
    dispatch({ type: 'RESET' });
  };
  
  const toggle = () => setIsOpen(prev => !prev);

  // Selectors
  const getPollData = () => selectPollData(state);

  const value: QuizFormContextValue = {
    state,
    isOpen,
    setMode,
    setQuestion,
    setAnswerText,
    addAnswer,
    removeAnswer,
    setCorrectAnswer,
    reset,
    open,
    close,
    toggle,
    getPollData,
  };

  return <QuizFormContext.Provider value={value}>{children}</QuizFormContext.Provider>;
}

export function useQuizForm() {
  const context = useContext(QuizFormContext);
  if (!context) {
    throw new Error('useQuizForm must be used within QuizFormProvider');
  }
  return context;
}
