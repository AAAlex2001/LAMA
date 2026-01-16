'use client';

import { useMemo, useReducer } from 'react';
import { initialQuizFormState, quizFormReducer } from './reducer';
import type { QuizFormAction, QuizFormMode, QuizFormState } from './types';
import { selectPollData } from './selectors';

export interface UseQuizFormStore {
  state: QuizFormState;
  pollData: ReturnType<typeof selectPollData>;
  dispatch: React.Dispatch<QuizFormAction>;
  actions: {
    setMode: (mode: QuizFormMode) => void;
    setQuestion: (value: string) => void;
    setAnswerText: (id: string, value: string) => void;
    addAnswer: () => void;
    removeAnswer: (id: string) => void;
    setCorrectAnswer: (id: string | null) => void;
    reset: () => void;
  };
}

export function useQuizFormStore(): UseQuizFormStore {
  const [state, dispatch] = useReducer(quizFormReducer, initialQuizFormState);

  const pollData = useMemo(() => selectPollData(state), [state]);

  return {
    state,
    pollData,
    dispatch,
    actions: {
      setMode: (mode) => dispatch({ type: 'SET_MODE', payload: mode }),
      setQuestion: (value) => dispatch({ type: 'SET_QUESTION', payload: value }),
      setAnswerText: (id, value) => dispatch({ type: 'SET_ANSWER_TEXT', payload: { id, text: value } }),
      addAnswer: () => dispatch({ type: 'ADD_ANSWER' }),
      removeAnswer: (id) => dispatch({ type: 'REMOVE_ANSWER', payload: { id } }),
      setCorrectAnswer: (id) => dispatch({ type: 'SET_CORRECT_ANSWER', payload: { id } }),
      reset: () => dispatch({ type: 'RESET' }),
    },
  };
}
