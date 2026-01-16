'use client';

import { useState } from 'react';
import styles from './quiz-form.module.scss';
import Input from '@/components/input/input';
import Toggle from '@/components/toggle/toggle';
import Button from '@/components/button/button';
import CloseIcon from '@/components/icons/close-icon';

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
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>([]);
  const [selectedRadioId, setSelectedRadioId] = useState<string | null>(null);

  const toggleAnswerSelection = (id: string) => {
    setSelectedAnswerIds(prev => 
      prev.includes(id) 
        ? prev.filter(answerId => answerId !== id)
        : [...prev, id]
    );
  };

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

  const removeAnswer = (id: string) => {
    if (answers.length > 2) {
      setAnswers(answers.filter(answer => answer.id !== id));
    }
  };

  const remainingAnswers = 10 - answers.length;

  if (!isOpen) return null;

  return (
    <div className={styles.quizForm}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerLabel}>{quizMode ? 'Новая викторина' : 'Новый опрос'}</div>
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
              icon={<CloseIcon width={16} height={16} color="#8C8C8C" />}
              onIconClick={() => removeAnswer(answer.id)}
              iconDisabled={answers.length <= 2}
              iconClassName={styles.deleteButton}
              showRadio={!multipleChoice}
              radioChecked={quizMode ? correctAnswerId === answer.id : selectedRadioId === answer.id}
              onRadioChange={() => quizMode ? setCorrectAnswerId(answer.id) : setSelectedRadioId(answer.id)}
              showCheckbox={multipleChoice}
              checkboxChecked={selectedAnswerIds.includes(answer.id)}
              onCheckboxChange={() => toggleAnswerSelection(answer.id)}
            />
          ))}
          
          <Button
            text="Добавить ответ"
            variant="templateCard"
            showArrow={false}
            fullWidth
            onClick={addAnswer}
            disabled={answers.length >= 10}
          />
          
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
        
        <div className={styles.toggleColumn}>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Режим викторины</span>
            <Toggle checked={quizMode} onChange={setQuizMode} />
          </div>
          
          {quizMode && (
            <div className={styles.quizHint}>
              В викторинах есть правильный вариант ответа, а пользователям недоступна возможность переголосовать
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
