import type { QuizFormState } from './types';

export interface PollData {
  question: string;
  options: string[];
  is_anonymous?: boolean;
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  is_quiz?: boolean;
}

export function selectFilledOptions(state: QuizFormState): { id: string; text: string }[] {
  return state.answers
    .map(a => ({ id: a.id, text: a.text.trim() }))
    .filter(a => a.text.length > 0);
}

export function selectPollData(state: QuizFormState): PollData | null {
  const question = state.question.trim();
  if (!question) return null;

  const filled = selectFilledOptions(state);
  if (filled.length < 2 || filled.length > 12) return null;

  switch (state.mode) {
    case 'quiz': {
      if (!state.correctAnswerId) return null;
      const correctIndex = filled.findIndex(o => o.id === state.correctAnswerId);
      if (correctIndex < 0) return null;
      return {
        question,
        options: filled.map(o => o.text),
        is_anonymous: true,
        allows_multiple_answers: false,
        correct_option_id: correctIndex,
        is_quiz: true,
      };
    }

    case 'poll_multi':
      return {
        question,
        options: filled.map(o => o.text),
        is_anonymous: true,
        allows_multiple_answers: true,
        is_quiz: false,
      };

    case 'poll_single':
    default:
      return {
        question,
        options: filled.map(o => o.text),
        is_anonymous: true,
        allows_multiple_answers: false,
        is_quiz: false,
      };
  }
}
