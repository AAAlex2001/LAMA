'use client';

import React, { useEffect } from 'react';
import Input from '@/components/input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import { Checkbox } from '@/components/checkbox';
import styles from '../styles.module.scss';
import type { CommandFormData } from '../index';
import {
  useAppDispatch,
  useAppSelector,
  setCreateCommandModalOpen,
  setCommand,
  setDescription,
  setCommandResponseText,
  setCommandResponseMediaUrl,
  setCommandResponseMediaType,
  setCommandScope,
  setCommandIsActive,
  resetCommandForm,
} from '../../../store';

interface CommandFormProps {
  onSubmit: (data: CommandFormData) => void;
  onCancel: () => void;
}

const CommandForm: React.FC<CommandFormProps> = ({ onSubmit, onCancel }) => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.createCommandModal);

  useEffect(() => {
    dispatch(setCreateCommandModalOpen(true));
    return () => {
      dispatch(resetCommandForm());
    };
  }, [dispatch]);

  const handleSubmit = () => {
    if (!formState.command.trim() || !formState.response_text.trim()) {
      return;
    }

    onSubmit({
      command: formState.command.trim(),
      description: formState.description.trim(),
      response_text: formState.response_text.trim(),
      response_media_url: formState.response_media_url.trim() || undefined,
      response_media_type: formState.response_media_type,
      response_buttons: {},
      scope: formState.scope,
      is_active: formState.is_active,
    });
  };

  const isSubmitDisabled = !formState.command.trim() || !formState.response_text.trim();

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Команда</div>
        <Input
          placeholder="/start"
          value={formState.command}
          onChange={(value) => dispatch(setCommand(value))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Описание</div>
        <Input
          placeholder="Описание команды"
          value={formState.description}
          onChange={(value) => dispatch(setDescription(value))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Текст ответа</div>
        <Input
          placeholder="Текст ответа на команду"
          value={formState.response_text}
          onChange={(value) => dispatch(setCommandResponseText(value))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Тип медиа</div>
        <div className={styles.radioGroup}>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.response_media_type === 'TEXT'}
              onChange={() => dispatch(setCommandResponseMediaType('TEXT'))}
            />
            <span className={styles.channelItemName}>Текст</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.response_media_type === 'IMAGE'}
              onChange={() => dispatch(setCommandResponseMediaType('IMAGE'))}
            />
            <span className={styles.channelItemName}>Изображение</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.response_media_type === 'VIDEO'}
              onChange={() => dispatch(setCommandResponseMediaType('VIDEO'))}
            />
            <span className={styles.channelItemName}>Видео</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.response_media_type === 'DOCUMENT'}
              onChange={() => dispatch(setCommandResponseMediaType('DOCUMENT'))}
            />
            <span className={styles.channelItemName}>Документ</span>
          </div>
        </div>
      </div>

      {formState.response_media_type !== 'TEXT' && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>URL медиа</div>
          <Input
            placeholder="https://example.com/media.jpg"
            value={formState.response_media_url}
            onChange={(value) => dispatch(setCommandResponseMediaUrl(value))}
          />
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Область действия</div>
        <div className={styles.radioGroup}>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.scope === 'PRIVATE'}
              onChange={() => dispatch(setCommandScope('PRIVATE'))}
            />
            <span className={styles.channelItemName}>Приватные чаты</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.scope === 'PUBLIC'}
              onChange={() => dispatch(setCommandScope('PUBLIC'))}
            />
            <span className={styles.channelItemName}>Публичные чаты</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Активна</span>
          <Toggle checked={formState.is_active} onChange={(value) => dispatch(setCommandIsActive(value))} />
        </div>
      </div>

      <div className={styles.submitButtonContainer}>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          onClick={handleSubmit}
          className={styles.submitButton}
          disabled={isSubmitDisabled}
        >
          Создать команду
        </Button>
      </div>
    </>
  );
};

export default CommandForm;
