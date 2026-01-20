'use client';

import styles from './quiz-form.module.scss';
import Input from '@/components/input/input';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';
import CloseIcon from '@/components/icons/close-icon';
import type { QuizFormMode, QuizFormState } from './store/types';
import { useQuizForm } from './QuizFormContext';

function QuizFormView({
  state,
  remainingAnswers,
  onQuestionChange,
  onAnswerChange,
  onAddAnswer,
  onRemoveAnswer,
  onModeChange,
  onCorrectAnswerChange,
}: {
  state: QuizFormState;
  remainingAnswers: number;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (id: string, value: string) => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (id: string) => void;
  onModeChange: (mode: QuizFormMode) => void;
  onCorrectAnswerChange: (id: string) => void;
}) {
  const isQuiz = state.mode === 'quiz';
  const isMulti = state.mode === 'poll_multi';

  return (
    <div className={styles.quizForm}>
      <div className={styles.header}>
        <div className={styles.headerLabel}>{isQuiz ? 'Новая викторина' : 'Новый опрос'}</div>
      </div>

      <div className={styles.questionSection}>
        <Input placeholder="Задайте вопрос" value={state.question} onChange={onQuestionChange} />
      </div>

      <div className={styles.answersSection}>
        <div className={styles.answersLabel}>Варианты ответа</div>

        <div className={styles.answersList}>
          {state.answers.map((answer) => (
            <Input
              key={answer.id}
              placeholder="Ответ"
              value={answer.text}
              onChange={(text) => onAnswerChange(answer.id, text)}
              icon={<CloseIcon width={16} height={16} color="#8C8C8C" />}
              onIconClick={() => onRemoveAnswer(answer.id)}
              iconDisabled={state.answers.length <= 2}
              iconClassName={styles.deleteButton}
              showRadio={isQuiz}
              radioChecked={state.correctAnswerId === answer.id}
              onRadioChange={() => onCorrectAnswerChange(answer.id)}
            />
          ))}

          <Button
            text="Добавить ответ"
            variant="templateCard"
            showArrow={false}
            fullWidth
            onClick={onAddAnswer}
            disabled={state.answers.length >= 12}
          />

          {remainingAnswers > 0 && (
            <div className={styles.hint}>
              Можно добавить ещё {remainingAnswers} {remainingAnswers === 1 ? 'вариант' : 'вариантов'} ответа
            </div>
          )}
        </div>
      </div>

      <div className={styles.togglesSection}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Выбор нескольких ответов</span>
          <Toggle
            checked={isMulti}
            onChange={(checked) => onModeChange(checked ? 'poll_multi' : 'poll_single')}
            disabled={isQuiz}
          />
        </div>

        <div className={styles.toggleColumn}>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Режим викторины</span>
            <Toggle
              checked={isQuiz}
              onChange={(checked) => onModeChange(checked ? 'quiz' : 'poll_single')}
              disabled={isMulti}
            />
          </div>

          {isQuiz && (
            <div className={styles.quizHint}>
              В викторинах есть правильный вариант ответа, а пользователям недоступна возможность переголосовать
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizForm() {
  const {
    isOpen,
    state,
    setMode,
    setQuestion,
    setAnswerText,
    addAnswer,
    removeAnswer,
    setCorrectAnswer,
  } = useQuizForm();

  if (!isOpen) return null;

  const remainingAnswers = 12 - state.answers.length;

  return (
    <QuizFormView
      state={state}
      remainingAnswers={remainingAnswers}
      onQuestionChange={setQuestion}
      onAnswerChange={setAnswerText}
      onAddAnswer={addAnswer}
      onRemoveAnswer={removeAnswer}
      onModeChange={setMode}
      onCorrectAnswerChange={setCorrectAnswer}
    />
  );
}
