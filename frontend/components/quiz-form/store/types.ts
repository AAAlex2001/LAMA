export type QuizFormMode = 'poll_single' | 'poll_multi' | 'quiz';

export interface QuizAnswer {
  id: string;
  text: string;
}

export interface QuizFormState {
  mode: QuizFormMode;
  question: string;
  answers: QuizAnswer[];
  correctAnswerId: string | null;
}

export type QuizFormAction =
  | { type: 'SET_MODE'; payload: QuizFormMode }
  | { type: 'SET_QUESTION'; payload: string }
  | { type: 'SET_ANSWER_TEXT'; payload: { id: string; text: string } }
  | { type: 'ADD_ANSWER' }
  | { type: 'REMOVE_ANSWER'; payload: { id: string } }
  | { type: 'SET_CORRECT_ANSWER'; payload: { id: string | null } }
  | { type: 'RESET' };
