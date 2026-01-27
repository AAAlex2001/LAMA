import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { QuizMode, QuizAnswer, PollData } from '../types';

interface QuizState {
  isOpen: boolean;
  mode: QuizMode;
  question: string;
  answers: QuizAnswer[];
  correctAnswerId: string | null;
}

function createAnswer(): QuizAnswer {
  return {
    id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text: '',
  };
}

const initialState: QuizState = {
  isOpen: false,
  mode: 'poll_single',
  question: '',
  answers: [createAnswer(), createAnswer()],
  correctAnswerId: null,
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    open(state) {
      state.isOpen = true;
    },
    close(state) {
      state.isOpen = false;
      state.mode = 'poll_single';
      state.question = '';
      state.answers = [createAnswer(), createAnswer()];
      state.correctAnswerId = null;
    },
    toggle(state) {
      state.isOpen = !state.isOpen;
    },
    setMode(state, action: PayloadAction<QuizMode>) {
      state.mode = action.payload;
      if (action.payload !== 'quiz') {
        state.correctAnswerId = null;
      }
    },
    setQuestion(state, action: PayloadAction<string>) {
      state.question = action.payload;
    },
    setAnswerText(state, action: PayloadAction<{ id: string; text: string }>) {
      const answer = state.answers.find(a => a.id === action.payload.id);
      if (answer) {
        answer.text = action.payload.text;
      }
    },
    setAnswers(state, action: PayloadAction<QuizAnswer[]>) {
      state.answers = action.payload;
    },
    addAnswer(state) {
      if (state.answers.length < 10) {
        state.answers.push(createAnswer());
      }
    },
    removeAnswer(state, action: PayloadAction<string>) {
      if (state.answers.length > 2) {
        state.answers = state.answers.filter(a => a.id !== action.payload);
        if (state.correctAnswerId === action.payload) {
          state.correctAnswerId = null;
        }
      }
    },
    setCorrectAnswer(state, action: PayloadAction<string | null>) {
      state.correctAnswerId = action.payload;
    },
    reset(state) {
      state.isOpen = false;
      state.mode = 'poll_single';
      state.question = '';
      state.answers = [createAnswer(), createAnswer()];
      state.correctAnswerId = null;
    },
  },
});

export const {
  open: openQuiz,
  close: closeQuiz,
  toggle: toggleQuiz,
  setMode,
  setQuestion,
  setAnswerText,
  setAnswers,
  addAnswer,
  removeAnswer,
  setCorrectAnswer,
  reset: resetQuiz,
} = quizSlice.actions;

export const updateAnswer = setAnswerText;
export const setOpen = (open: boolean) => open ? quizSlice.actions.open() : quizSlice.actions.close();

export default quizSlice.reducer;

export function selectPollData(state: QuizState): PollData | null {
  if (!state.question.trim()) return null;
  const options = state.answers.map(a => a.text).filter(t => t.trim());
  if (options.length < 2) return null;

  const isQuiz = state.mode === 'quiz';
  const allowsMultiple = state.mode === 'poll_multi';
  const correctIndex = isQuiz && state.correctAnswerId
    ? state.answers.findIndex(a => a.id === state.correctAnswerId)
    : null;

  return {
    question: state.question,
    options,
    is_anonymous: true,
    allows_multiple_answers: allowsMultiple,
    correct_option_id: correctIndex !== null && correctIndex >= 0 ? correctIndex : null,
    is_quiz: isQuiz,
  };
}
