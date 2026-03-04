'use client';

import React, { useEffect } from 'react';
import Input from '@/components/input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import { Checkbox } from '@/components/checkbox';
import styles from '../styles.module.scss';
import type { TriggerFormData } from '../index';
import {
  useAppDispatch,
  useAppSelector,
  setCreateTriggerModalOpen,
  setTriggerName,
  setTriggerType,
  setActionType,
  setActionText,
  setActionMediaUrl,
  setActionMediaType,
  setActionButtons,
  setActionDurationMinutes,
  setDelayMinutes,
  setChatType,
  setTriggerIsActive,
  resetTriggerForm,
  type TriggerTypeEnum,
  type ActionTypeEnum,
} from '../../../store';

interface TriggerFormProps {
  onSubmit: (data: TriggerFormData) => void;
  onCancel: () => void;
}

const TRIGGER_TYPE_LABELS: Record<TriggerTypeEnum, string> = {
  JOIN_REQUEST_CREATED: 'Создана заявка на вступление',
  JOIN_REQUEST_APPROVED: 'Заявка на вступление одобрена',
  JOIN_REQUEST_REJECTED: 'Заявка на вступление отклонена',
  MEMBER_JOINED: 'Пользователь присоединился',
  MEMBER_LEFT: 'Пользователь покинул',
  CAPTCHA_PASSED: 'Капча пройдена',
  CAPTCHA_FAILED: 'Капча не пройдена',
  USER_MESSAGE: 'Получено сообщение',
  COMMAND_CALLED: 'Вызвана команда',
};

const ACTION_TYPE_LABELS: Record<ActionTypeEnum, string> = {
  SEND_MESSAGE: 'Отправить сообщение',
  SEND_MEDIA: 'Отправить медиа',
  ADD_TO_GROUP: 'Добавить в группу',
  REMOVE_FROM_GROUP: 'Удалить из группы',
  MUTE_USER: 'Заглушить пользователя',
  BAN_USER: 'Забанить пользователя',
};

const TriggerForm: React.FC<TriggerFormProps> = ({ onSubmit, onCancel }) => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.createTriggerModal);

  useEffect(() => {
    dispatch(setCreateTriggerModalOpen(true));
    return () => {
      dispatch(resetTriggerForm());
    };
  }, [dispatch]);

  const buildActionData = (): Record<string, unknown> => {
    const actionData: Record<string, unknown> = {};
    
    switch (formState.action_type) {
      case 'SEND_MESSAGE':
        actionData.text = formState.action_text;
        if (formState.action_buttons) {
          try {
            actionData.buttons = JSON.parse(formState.action_buttons);
          } catch {
            actionData.buttons = {};
          }
        }
        break;
      case 'SEND_MEDIA':
        actionData.media_url = formState.action_media_url;
        actionData.media_type = formState.action_media_type;
        if (formState.action_text) {
          actionData.text = formState.action_text;
        }
        break;
      case 'MUTE_USER':
      case 'BAN_USER':
        actionData.duration_minutes = formState.action_duration_minutes;
        break;
      case 'ADD_TO_GROUP':
      case 'REMOVE_FROM_GROUP':
        // No additional data needed
        break;
    }
    
    return actionData;
  };

  const handleSubmit = () => {
    if (!formState.name.trim()) {
      return;
    }

    onSubmit({
      name: formState.name.trim(),
      trigger_type: formState.trigger_type,
      action_type: formState.action_type,
      action_data: buildActionData(),
      delay_minutes: formState.delay_minutes,
      delivery_window: {},
      filters: {},
      chat_type: formState.chat_type,
      is_active: formState.is_active,
    });
  };

  const isSubmitDisabled = !formState.name.trim();

  const showTextField = formState.action_type === 'SEND_MESSAGE' || formState.action_type === 'SEND_MEDIA';
  const showMediaFields = formState.action_type === 'SEND_MEDIA';
  const showButtonsField = formState.action_type === 'SEND_MESSAGE';
  const showDurationField = formState.action_type === 'MUTE_USER' || formState.action_type === 'BAN_USER';

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Название триггера</div>
        <Input
          placeholder="Название триггера"
          value={formState.name}
          onChange={(value) => dispatch(setTriggerName(value))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Тип триггера</div>
        <div className={styles.radioGroup}>
          {(Object.keys(TRIGGER_TYPE_LABELS) as TriggerTypeEnum[]).map((triggerType) => (
            <div key={triggerType} className={styles.radioGroupItem}>
              <Checkbox
                variant="radio"
                checked={formState.trigger_type === triggerType}
                onChange={() => dispatch(setTriggerType(triggerType))}
              />
              <span className={styles.channelItemName}>{TRIGGER_TYPE_LABELS[triggerType]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Тип действия</div>
        <div className={styles.radioGroup}>
          {(Object.keys(ACTION_TYPE_LABELS) as ActionTypeEnum[]).map((actionType) => (
            <div key={actionType} className={styles.radioGroupItem}>
              <Checkbox
                variant="radio"
                checked={formState.action_type === actionType}
                onChange={() => dispatch(setActionType(actionType))}
              />
              <span className={styles.channelItemName}>{ACTION_TYPE_LABELS[actionType]}</span>
            </div>
          ))}
        </div>
      </div>

      {showTextField && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Текст сообщения</div>
          <Input
            placeholder="Текст сообщения"
            value={formState.action_text}
            onChange={(value) => dispatch(setActionText(value))}
          />
        </div>
      )}

      {showMediaFields && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Тип медиа</div>
            <div className={styles.radioGroup}>
              <div className={styles.radioGroupItem}>
                <Checkbox
                  variant="radio"
                  checked={formState.action_media_type === 'IMAGE'}
                  onChange={() => dispatch(setActionMediaType('IMAGE'))}
                />
                <span className={styles.channelItemName}>Изображение</span>
              </div>
              <div className={styles.radioGroupItem}>
                <Checkbox
                  variant="radio"
                  checked={formState.action_media_type === 'VIDEO'}
                  onChange={() => dispatch(setActionMediaType('VIDEO'))}
                />
                <span className={styles.channelItemName}>Видео</span>
              </div>
              <div className={styles.radioGroupItem}>
                <Checkbox
                  variant="radio"
                  checked={formState.action_media_type === 'DOCUMENT'}
                  onChange={() => dispatch(setActionMediaType('DOCUMENT'))}
                />
                <span className={styles.channelItemName}>Документ</span>
              </div>
            </div>
          </div>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>URL медиа</div>
            <Input
              placeholder="https://example.com/media.jpg"
              value={formState.action_media_url}
              onChange={(value) => dispatch(setActionMediaUrl(value))}
            />
          </div>
        </>
      )}

      {showButtonsField && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Кнопки (JSON)</div>
          <div className={styles.sectionDescription}>
            JSON объект с кнопками. Например: {"{"}"inline_keyboard": [[{"{"}"text": "Кнопка", "url": "https://example.com"{"}"}]]{"}"}
          </div>
          <Input
            placeholder='{"inline_keyboard": [[{"text": "Кнопка", "url": "https://example.com"}]]}'
            value={formState.action_buttons}
            onChange={(value) => dispatch(setActionButtons(value))}
          />
        </div>
      )}

      {showDurationField && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Длительность (минуты)</div>
          <Input
            placeholder="0"
            value={formState.action_duration_minutes.toString()}
            onChange={(value) => dispatch(setActionDurationMinutes(parseInt(value) || 0))}
          />
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Задержка (минуты)</div>
        <Input
          placeholder="0"
          value={formState.delay_minutes.toString()}
          onChange={(value) => dispatch(setDelayMinutes(parseInt(value) || 0))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Тип чата</div>
        <div className={styles.radioGroup}>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.chat_type === 'PRIVATE'}
              onChange={() => dispatch(setChatType('PRIVATE'))}
            />
            <span className={styles.channelItemName}>Приватные</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.chat_type === 'GROUP'}
              onChange={() => dispatch(setChatType('GROUP'))}
            />
            <span className={styles.channelItemName}>Группы</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={formState.chat_type === 'BOTH'}
              onChange={() => dispatch(setChatType('BOTH'))}
            />
            <span className={styles.channelItemName}>Оба</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Активен</span>
          <Toggle checked={formState.is_active} onChange={(value) => dispatch(setTriggerIsActive(value))} />
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
          Создать триггер
        </Button>
      </div>
    </>
  );
};

export default TriggerForm;
