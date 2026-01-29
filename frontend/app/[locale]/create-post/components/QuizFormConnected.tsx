'use client';

import QuizForm from '@/components/quiz-form/quiz-form';
import { useAppDispatch, useAppSelector } from '../store';
import * as quizSlice from '../store/slices/quiz';

export default function QuizFormConnected() {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector(state => state.quiz.isOpen);
  const mode = useAppSelector(state => state.quiz.mode);
  const question = useAppSelector(state => state.quiz.question);
  const answers = useAppSelector(state => state.quiz.answers);
  const correctAnswerId = useAppSelector(state => state.quiz.correctAnswerId);

  return (
    <QuizForm
      isOpen={isOpen}
      mode={mode}
      question={question}
      answers={answers}
      correctAnswerId={correctAnswerId}
      onModeChange={(mode) => dispatch(quizSlice.setMode(mode))}
      onQuestionChange={(v) => dispatch(quizSlice.setQuestion(v))}
      onAnswerChange={(id, text) => dispatch(quizSlice.updateAnswer({ id, text }))}
      onAddAnswer={() => dispatch(quizSlice.addAnswer())}
      onRemoveAnswer={(id) => dispatch(quizSlice.removeAnswer(id))}
      onCorrectAnswerChange={(id) => dispatch(quizSlice.setCorrectAnswer(id))}
    />
  );
}
