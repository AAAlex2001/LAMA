'use client';

import { useState } from 'react';
import styles from './quiz-form.module.scss';
import Input from '@/components/input/input';
import Toggle from '@/components/toggle/toggle';

interface QuizAnswer {
  id: string;
  text: string;
}

interface QuizFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: {
    question: string;
    answers: string[];
    multipleChoice: boolean;
    quizMode: boolean;
  }) => void;
}

export default function QuizForm({ isOpen, onClose, onSubmit }: QuizFormProps) {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<QuizAnswer[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [quizMode, setQuizMode] = useState(false);

  const addAnswer = () => {
    if (answers.length < 10) {
      setAnswers([...answers, { id: Date.now().toString(), text: '' }]);
    }
  };

  const updateAnswer = (id: string, text: string) => {
    setAnswers(answers.map(answer => 
      answer.id === id ? { ...answer, text } : answer
    ));
  };

  const remainingAnswers = 10 - answers.length;

  if (!isOpen) return null;

  return (
    <div className={styles.quizForm}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerLabel}>Новый опрос</div>
      </div>

      {/* Секция вопроса */}
      <div className={styles.questionSection}>
        <Input
          placeholder="Задайте вопрос"
          value={question}
          onChange={setQuestion}
        />
      </div>

      {/* Секция вариантов ответа */}
      <div className={styles.answersSection}>
        <div className={styles.answersLabel}>Варианты ответа</div>
        
        <div className={styles.answersList}>
          {answers.map((answer, index) => (
            <Input
              key={answer.id}
              placeholder="Ответ"
              value={answer.text}
              onChange={(text) => updateAnswer(answer.id, text)}
            />
          ))}
          
          <button 
            className={styles.addAnswerButton}
            onClick={addAnswer}
            disabled={answers.length >= 10}
          >
            Добавить ответ
          </button>
          
          {remainingAnswers > 0 && (
            <div className={styles.hint}>
              Можно добавить ещё {remainingAnswers} {remainingAnswers === 1 ? 'вариант' : 'вариантов'} ответа
            </div>
          )}
        </div>
      </div>

      {/* Тоглеры */}
      <div className={styles.togglesSection}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Выбор нескольких ответов</span>
          <Toggle checked={multipleChoice} onChange={setMultipleChoice} />
        </div>
        
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Режим викторины</span>
          <Toggle checked={quizMode} onChange={setQuizMode} />
        </div>
      </div>
    </div>
  );
}
