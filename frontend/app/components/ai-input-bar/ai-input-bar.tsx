'use client';

import { useState } from 'react';
import styles from './ai-input-bar.module.scss';
import Input from '@/components/input';
import { SendIcon, AiLoaderIcon } from '@/components/icons';

interface AiInputBarProps {
  onSubmit: (prompt: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

const quickCommands = [
  'Перевести текст',
  'Сократить текст',
  'Расширить текст',
  'Найти и исправить ошибки',
  'Изменить тональность',
  'Переформулировать',
];

export default function AiInputBar({ 
  onSubmit, 
  placeholder = 'Напишите, что нужно сделать с текстом…',
  className 
}: AiInputBarProps) {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (prompt?: string) => {
    const textToSubmit = prompt || value;
    if (!textToSubmit.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSubmit(textToSubmit);
      setValue('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickCommand = (label: string) => {
    setValue(label);
  };

  return (
    <div className={`${styles.aiInputBarWrapper} ${className || ''}`}>
      <div className={styles.aiInputBar} onKeyDown={handleKeyDown}>
        <Input
          value={value}
          onChange={setValue}
          placeholder={placeholder}
          disabled={isLoading}
          className={styles.input}
          icon={isLoading ? <AiLoaderIcon /> : <SendIcon />}
          onIconClick={() => handleSubmit()}
          iconDisabled={isLoading || !value.trim()}
          variant="white"
        />
      </div>

      <div className={styles.quickCommandsSection}>
        <span className={styles.quickCommandsTitle}>Быстрые команды</span>
        <div className={styles.quickCommandsGrid}>
          {quickCommands.map((cmd, i) => (
            <button 
              key={i} 
              className={styles.quickCommand}
              onClick={() => handleQuickCommand(cmd)}
              disabled={isLoading}
            >
              <span className={styles.dot} />
              <span>{cmd}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
