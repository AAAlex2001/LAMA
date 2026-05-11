'use client';

import styles from './quiz-form.module.scss';
import Input from '@/components/input/input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import CloseIcon from '@/components/icons/close-icon';

export type QuizMode = 'poll_single' | 'poll_multi' | 'quiz';

export interface QuizAnswer {
  id: string;
  text: string;
}

interface QuizFormProps {
  isOpen: boolean;
  mode: QuizMode;
  question: string;
  answers: QuizAnswer[];
  correctAnswerId: string | null;
  onModeChange: (mode: QuizMode) => void;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (id: string, text: string) => void;
  onAddAnswer: () => void;
  onRemoveAnswer: (id: string) => void;
  onCorrectAnswerChange: (id: string) => void;
}

export default function QuizForm({
  isOpen,
  mode,
  question,
  answers,
  correctAnswerId,
  onModeChange,
  onQuestionChange,
  onAnswerChange,
  onAddAnswer,
  onRemoveAnswer,
  onCorrectAnswerChange,
}: QuizFormProps) {
  if (!isOpen) return null;

  const isQuiz = mode === 'quiz';
  const isMulti = mode === 'poll_multi';
  const remainingAnswers = 12 - answers.length;
  const canRemoveAnswer = answers.length > 2;
  const canAddAnswer = answers.length < 12;

  const title = isQuiz ? 'Новая викторина' : 'Новый опрос';

  const handleMultiToggle = (checked: boolean) => {
    onModeChange(checked ? 'poll_multi' : 'poll_single');
  };

  const handleQuizToggle = (checked: boolean) => {
    onModeChange(checked ? 'quiz' : 'poll_single');
  };

  return (
    <div className={styles.quizForm}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerLabel}>{title}</div>
      </div>

      {/* Вопрос */}
      <div className={styles.questionSection}>
        <Input
          placeholder="Задайте вопрос"
          value={question}
          onChange={onQuestionChange}
        />
      </div>

      {/* Варианты ответа */}
      <div className={styles.answersSection}>
        <div className={styles.answersLabel}>Варианты ответа</div>

        <div className={styles.answersList}>
          {answers.map(answer => (
            <Input
              key={answer.id}
              placeholder="Ответ"
              value={answer.text}
              onChange={text => onAnswerChange(answer.id, text)}
              icon={<CloseIcon width={16} height={16} color="#8C8C8C" />}
              onIconClick={() => onRemoveAnswer(answer.id)}
              iconDisabled={!canRemoveAnswer}
              iconClassName={styles.deleteButton}
              showRadio={isQuiz}
              radioChecked={correctAnswerId === answer.id}
              onRadioChange={() => onCorrectAnswerChange(answer.id)}
            />
          ))}

          <Button
            variant="soft"
            intent="neutral"
            size="lg"
            style={{ width: '100%' }}
            onClick={onAddAnswer}
            disabled={!canAddAnswer}
          >
            Добавить ответ
          </Button>

          {remainingAnswers > 0 && (
            <div className={styles.hint}>
              Можно добавить ещё {remainingAnswers}{' '}
              {remainingAnswers === 1 ? 'вариант' : 'вариантов'} ответа
            </div>
          )}
        </div>
      </div>

      {/* Переключатели */}
      <div className={styles.togglesSection}>
        <div className={styles.toggleColumn}>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Выбор нескольких ответов</span>
            <Toggle
              checked={isMulti}
              onChange={handleMultiToggle}
              disabled={isQuiz}
            />
          </div>

          {isQuiz && (
            <div className={styles.quizHint}>
              В режиме викторины недоступна опция выбора нескольких ответов
            </div>
          )}
        </div>

        <div className={styles.toggleColumn}>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Режим викторины</span>
            <Toggle
              checked={isQuiz}
              onChange={handleQuizToggle}
              disabled={isMulti}
            />
          </div>

          {isQuiz ? (
            <div className={styles.quizHint}>
              В викторинах есть правильный вариант ответа, а пользователям
              недоступна возможность переголосовать
            </div>
          ) : isMulti ? (
            <div className={styles.quizHint}>
              Режим викторины недоступен при активной опции выбора нескольких вариантов ответа
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
