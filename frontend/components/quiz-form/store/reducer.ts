import type { QuizFormAction, QuizFormMode, QuizFormState } from './types';

function createAnswer(id: string) {
  return { id, text: '' };
}

export const initialQuizFormState: QuizFormState = {
  mode: 'poll_single',
  question: '',
  answers: [createAnswer('1'), createAnswer('2')],
  correctAnswerId: null,
};

function normalizeForMode(state: QuizFormState, nextMode: QuizFormMode): QuizFormState {
  if (nextMode !== 'quiz') {
    return { ...state, mode: nextMode, correctAnswerId: null };
  }
  return { ...state, mode: 'quiz' };
}

export function quizFormReducer(state: QuizFormState, action: QuizFormAction): QuizFormState {
  switch (action.type) {
    case 'SET_MODE':
      return normalizeForMode(state, action.payload);

    case 'SET_QUESTION':
      return { ...state, question: action.payload };

    case 'SET_ANSWER_TEXT':
      return {
        ...state,
        answers: state.answers.map(a => (a.id === action.payload.id ? { ...a, text: action.payload.text } : a)),
      };

    case 'ADD_ANSWER': {
      if (state.answers.length >= 12) return state;
      return { ...state, answers: [...state.answers, createAnswer(Date.now().toString())] };
    }

    case 'REMOVE_ANSWER': {
      if (state.answers.length <= 2) return state;
      const nextAnswers = state.answers.filter(a => a.id !== action.payload.id);
      const correctAnswerId = state.correctAnswerId === action.payload.id ? null : state.correctAnswerId;
      return { ...state, answers: nextAnswers, correctAnswerId };
    }

    case 'SET_CORRECT_ANSWER':
      return { ...state, correctAnswerId: action.payload.id };

    case 'RESET':
      return initialQuizFormState;

    default:
      return state;
  }
}
