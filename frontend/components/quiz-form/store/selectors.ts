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
  console.log('[QuizForm Selector] Computing pollData from state:', {
    mode: state.mode,
    question: state.question,
    answersCount: state.answers.length,
    correctAnswerId: state.correctAnswerId,
  });

  const question = state.question.trim();
  if (!question) {
    console.log('[QuizForm Selector] ❌ NULL - no question');
    return null;
  }

  const filled = selectFilledOptions(state);
  console.log('[QuizForm Selector] Filled options:', filled);
  
  if (filled.length < 2 || filled.length > 10) {
    console.log('[QuizForm Selector] ❌ NULL - invalid filled options count:', filled.length);
    return null;
  }

  let result: PollData | null = null;

  switch (state.mode) {
    case 'quiz': {
      if (!state.correctAnswerId) {
        console.log('[QuizForm Selector] ❌ NULL - quiz without correctAnswerId');
        return null;
      }
      const correctIndex = filled.findIndex(o => o.id === state.correctAnswerId);
      if (correctIndex < 0) {
        console.log('[QuizForm Selector] ❌ NULL - correctAnswerId not found in filled options');
        return null;
      }
      result = {
        question,
        options: filled.map(o => o.text),
        is_anonymous: true,
        allows_multiple_answers: false,
        correct_option_id: correctIndex,
        is_quiz: true,
      };
      break;
    }

    case 'poll_multi':
      result = {
        question,
        options: filled.map(o => o.text),
        is_anonymous: true,
        allows_multiple_answers: true,
        is_quiz: false,
      };
      break;

    case 'poll_single':
    default:
      result = {
        question,
        options: filled.map(o => o.text),
        is_anonymous: true,
        allows_multiple_answers: false,
        is_quiz: false,
      };
      break;
  }

  console.log('[QuizForm Selector] ✅ Returning pollData:', result);
  return result;
}
