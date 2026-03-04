'use client';

import React, { useEffect } from 'react';
import Input from '@/components/input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import { Checkbox } from '@/components/checkbox';
import styles from '../styles.module.scss';
import type { AutoReplyFormData } from '../index';
import {
  useAppDispatch,
  useAppSelector,
  setCreateAutoReplyModalOpen,
  setKeyword,
  addKeyword,
  removeKeyword,
  setResponseText,
  setResponseMediaUrl,
  setResponseMediaType,
  setAutoReplyScope,
  setAutoReplyIsActive,
  resetAutoReplyForm,
} from '../../../store';

interface AutoReplyFormProps {
  onSubmit: (data: AutoReplyFormData) => void;
  onCancel: () => void;
}

const AutoReplyForm: React.FC<AutoReplyFormProps> = ({ onSubmit, onCancel }) => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.createAutoReplyModal);

  useEffect(() => {
    dispatch(setCreateAutoReplyModalOpen(true));
    return () => {
      dispatch(resetAutoReplyForm());
    };
  }, [dispatch]);

  const handleSubmit = () => {
    const validKeywords = formState.keywords.filter(k => k.trim()).map(k => k.trim());
    if (validKeywords.length === 0 || !formState.response_text.trim()) {
      return;
    }

    onSubmit({
      keywords: validKeywords,
      response_text: formState.response_text.trim(),
      response_media_url: formState.response_media_url.trim() || undefined,
      response_media_type: formState.response_media_type,
      response_buttons: {},
      scope: formState.scope,
      is_active: formState.is_active,
    });
  };

  const validKeywords = formState.keywords.filter(k => k.trim());
  const isSubmitDisabled = validKeywords.length === 0 || !formState.response_text.trim();

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Ключевые слова</div>
        <div className={styles.sectionDescription}>
          Добавьте ключевые слова, на которые бот будет отвечать автоматически
        </div>
        {formState.keywords.map((keyword, index) => (
          <div key={index} className={styles.keywordRow}>
            <Input
              placeholder="Ключевое слово"
              value={keyword}
              onChange={(value) => dispatch(setKeyword({ index, value }))}
            />
            {formState.keywords.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                intent="destructive"
                size="sm"
                onClick={() => dispatch(removeKeyword(index))}
                className={styles.removeButton}
              >
                Удалить
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          intent="gradient"
          size="md"
          onClick={() => dispatch(addKeyword())}
          className={styles.addButton}
        >
          Добавить ключевое слово
        </Button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Текст ответа</div>
        <Input
          placeholder="Текст ответа на ключевое слово"
          value={formState.response_text}
          onChange={(value) => dispatch(setResponseText(value))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Тип медиа</div>
        <div className={styles.radioGroup}>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.response_media_type === 'TEXT'}
              onChange={() => dispatch(setResponseMediaType('TEXT'))}
            />
            <span className={styles.channelItemName}>Текст</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.response_media_type === 'IMAGE'}
              onChange={() => dispatch(setResponseMediaType('IMAGE'))}
            />
            <span className={styles.channelItemName}>Изображение</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.response_media_type === 'VIDEO'}
              onChange={() => dispatch(setResponseMediaType('VIDEO'))}
            />
            <span className={styles.channelItemName}>Видео</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.response_media_type === 'DOCUMENT'}
              onChange={() => dispatch(setResponseMediaType('DOCUMENT'))}
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
            onChange={(value) => dispatch(setResponseMediaUrl(value))}
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
              onChange={() => dispatch(setAutoReplyScope('PRIVATE'))}
            />
            <span className={styles.channelItemName}>Приватные чаты</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.scope === 'PUBLIC'}
              onChange={() => dispatch(setAutoReplyScope('PUBLIC'))}
            />
            <span className={styles.channelItemName}>Публичные чаты</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Активен</span>
          <Toggle checked={formState.is_active} onChange={(value) => dispatch(setAutoReplyIsActive(value))} />
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
          Создать автоответ
        </Button>
      </div>
    </>
  );
};

export default AutoReplyForm;
