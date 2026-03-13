'use client';

import React, { useEffect, useRef } from 'react';
import Input from '@/components/input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import { Checkbox } from '@/components/checkbox';
import SimpleDropdown from '@/components/simple-dropdown/simple-dropdown';
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
  setTriggerBotSearch,
  toggleTriggerSelectedBotId,
  resetTriggerForm,
  type TriggerTypeEnum,
  type ActionTypeEnum,
} from '../../../store';
import BotSearchSelector from '../../BotSearchSelector';
import { selectBots, selectBotsLoading } from '../../../store/selectors';
import ResponseTextSection, { type ResponseTextSectionRef } from '../../ResponseTextSection';
import { uploadMediaFile } from '@/app/[locale]/create-post/store/thunks/api';
import { API_BASE_URL } from '@/app/[locale]/create-post/store/thunks/api';
import { buildInlineKeyboard } from '@/app/[locale]/create-post/store/thunks/utils';

interface TriggerFormProps {
  onSubmit: (data: TriggerFormData) => void;
  onCancel: () => void;
  bots?: Array<{ id: number; username?: string; title?: string }>;
  hideSearchBar?: boolean;
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
  ADD_TO_GROUP: 'Добавить в группу',
  REMOVE_FROM_GROUP: 'Удалить из группы',
  MUTE_USER: 'Заглушить пользователя',
  BAN_USER: 'Забанить пользователя',
};

const TriggerForm: React.FC<TriggerFormProps> = ({ onSubmit, onCancel, bots: propsBots, hideSearchBar = false }) => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.createTriggerModal);
  const storeBots = useAppSelector((state) => selectBots(state));
  const botsLoading = useAppSelector((state) => selectBotsLoading(state));
  const bots = propsBots || storeBots;
  const botSearch = formState.botSearch;
  const selectedBotIds = new Set(formState.selectedBotIds);
  const responseTextSectionRef = useRef<ResponseTextSectionRef>(null);

  useEffect(() => {
    dispatch(setCreateTriggerModalOpen(true));
    return () => {
      dispatch(resetTriggerForm());
    };
  }, [dispatch]);

  const buildActionData = async (): Promise<Record<string, unknown>> => {
    const actionData: Record<string, unknown> = {};
    const { limitedMediaFiles, inlineButtonRows } = responseTextSectionRef.current || { limitedMediaFiles: [], inlineButtonRows: [] };
    
    switch (formState.action_type) {
      case 'SEND_MESSAGE':{
        const baseUrl = API_BASE_URL.replace('/api', '');
        const mediaUrls: string[] = [];

        for (const mediaFile of limitedMediaFiles) {
          if (mediaFile.url) {
            mediaUrls.push(mediaFile.url);
          } else if (mediaFile.file) {
            try {
              const uploaded = await uploadMediaFile(mediaFile.file);
              const url = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
              mediaUrls.push(url);
            } catch (error) {
              console.error('Failed to upload media:', error);
              throw error;
            }
          }
        }

        actionData.media_url = mediaUrls[0] || '';
        actionData.media_urls = mediaUrls;
        actionData.media_type = formState.action_media_type;
        if (formState.action_text) {
          actionData.text = formState.action_text;
        }
        const inlineButtons = buildInlineKeyboard(inlineButtonRows);
        if (inlineButtons) {
          actionData.buttons = inlineButtons;
        }
        break;
      }
      case 'MUTE_USER':
      case 'BAN_USER':
        actionData.duration_minutes = formState.action_duration_minutes;
        break;
      case 'ADD_TO_GROUP':
      case 'REMOVE_FROM_GROUP':
        break;
    }
    
    return actionData;
  };

  const handleSubmit = async () => {
    if (!formState.name.trim() || selectedBotIds.size === 0) {
      return;
    }

    try {
      const actionData = await buildActionData();
      
      onSubmit({
        name: formState.name.trim(),
        trigger_type: formState.trigger_type,
        action_type: formState.action_type,
        action_data: actionData,
        delay_minutes: formState.delay_minutes,
        delivery_window: {},
        filters: {},
        chat_type: formState.chat_type,
        is_active: formState.is_active,
        botIds: Array.from(selectedBotIds).map(id => parseInt(id)),
      });
    } catch (error) {
      console.error('Failed to submit trigger:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSubmitDisabled = !formState.name.trim() || selectedBotIds.size === 0;

  const showTextField = formState.action_type === 'SEND_MESSAGE';
  const showDurationField = formState.action_type === 'MUTE_USER' || formState.action_type === 'BAN_USER';

  const triggerTypeItems = (Object.keys(TRIGGER_TYPE_LABELS) as TriggerTypeEnum[]).map((triggerType) => ({
    value: triggerType,
    label: TRIGGER_TYPE_LABELS[triggerType],
  }));

  const actionTypeItems = (Object.keys(ACTION_TYPE_LABELS) as ActionTypeEnum[]).map((actionType) => ({
    value: actionType,
    label: ACTION_TYPE_LABELS[actionType],
  }));

  const selectedTriggerTypeLabel = TRIGGER_TYPE_LABELS[formState.trigger_type] || '';
  const selectedActionTypeLabel = ACTION_TYPE_LABELS[formState.action_type] || '';

  return (
    <>
      {!hideSearchBar && (
        <BotSearchSelector
          bots={bots || []}
          searchValue={botSearch}
          onSearchChange={(value) => dispatch(setTriggerBotSearch(value))}
          selectedBotIds={selectedBotIds}
          onBotToggle={(botId) => dispatch(toggleTriggerSelectedBotId(botId))}
          isLoading={botsLoading}
        />
      )}

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
        <SimpleDropdown
          value={selectedTriggerTypeLabel}
          items={triggerTypeItems}
          onSelect={(value) => dispatch(setTriggerType(value as TriggerTypeEnum))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Тип действия</div>
        <SimpleDropdown
          value={selectedActionTypeLabel}
          items={actionTypeItems}
          onSelect={(value) => dispatch(setActionType(value as ActionTypeEnum))}
        />
      </div>

      {showTextField && (
        <ResponseTextSection
          ref={responseTextSectionRef}
          responseText={formState.action_text}
          onResponseTextChange={(value) => dispatch(setActionText(value))}
          onKeyDown={handleKeyDown}
          onMediaTypeChange={(mediaType) => dispatch(setActionMediaType(mediaType))}
          onMediaUrlChange={(mediaUrl) => dispatch(setActionMediaUrl(mediaUrl))}
        />
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
          loading={formState.isSubmitting}
        >
          Создать триггер
        </Button>
      </div>
    </>
  );
};

export default TriggerForm;
