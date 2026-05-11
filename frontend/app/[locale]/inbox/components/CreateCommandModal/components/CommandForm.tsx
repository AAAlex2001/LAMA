'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  setCommandBotSearch,
  toggleCommandSelectedBotId,
  resetCommandForm,
} from '../../../store';
import BotSearchSelector from '../../BotSearchSelector';
import { useBotsQuery } from '@/store/bots';
import ResponseTextSection, { type ResponseTextSectionRef } from '../../ResponseTextSection';
import { uploadMediaFile, API_BASE_URL } from '@/store/api';
import { buildInlineKeyboard } from '@/store/utils';

interface CommandFormProps {
  onSubmit: (data: CommandFormData) => void;
  onCancel: () => void;
}

const CommandForm: React.FC<CommandFormProps> = ({ onSubmit, onCancel }) => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.createCommandModal);
  const botsQuery = useBotsQuery();
  const bots = botsQuery.data?.items ?? [];
  const botsLoading = botsQuery.isLoading;
  const botSearch = formState.botSearch;
  const selectedBotIds = new Set(formState.selectedBotIds);
  const responseTextSectionRef = useRef<ResponseTextSectionRef>(null);
  const [isMediaUploading, setIsMediaUploading] = useState(false);

  useEffect(() => {
    dispatch(setCreateCommandModalOpen(true));
    return () => {
      dispatch(resetCommandForm());
    };
  }, [dispatch]);

  const handleSubmit = async () => {
    if (!formState.command.trim() || !formState.response_text.trim() || selectedBotIds.size === 0) {
      return;
    }

    const { limitedMediaFiles, inlineButtonRows } = responseTextSectionRef.current || { limitedMediaFiles: [], inlineButtonRows: [] };

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
          return;
        }
      }
    }

    const inlineButtons = buildInlineKeyboard(inlineButtonRows);
    onSubmit({
      command: formState.command.trim(),
      description: formState.description.trim(),
      response_text: formState.response_text.trim(),
      response_media_url: mediaUrls[0] || undefined,
      response_media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      response_media_type: formState.response_media_type,
      response_buttons: inlineButtons,
      scope: formState.scope,
      is_active: formState.is_active,
      botIds: Array.from(selectedBotIds).map(id => parseInt(id)),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSubmitDisabled = !formState.command.trim() || !formState.response_text.trim() || selectedBotIds.size === 0;

  return (
    <>
      <BotSearchSelector
        bots={bots || []}
        searchValue={botSearch}
        onSearchChange={(value) => dispatch(setCommandBotSearch(value))}
        selectedBotIds={selectedBotIds}
        onBotToggle={(botId) => dispatch(toggleCommandSelectedBotId(botId))}
        isLoading={botsLoading}
      />

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

      <ResponseTextSection
        ref={responseTextSectionRef}
        responseText={formState.response_text}
        onResponseTextChange={(value) => dispatch(setCommandResponseText(value))}
        onKeyDown={handleKeyDown}
        onMediaTypeChange={(mediaType) => dispatch(setCommandResponseMediaType(mediaType))}
        onMediaUrlChange={(mediaUrl) => dispatch(setCommandResponseMediaUrl(mediaUrl))}
        onMediaUploadLoadingChange={setIsMediaUploading}
      />

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
              checked={formState.scope === 'GROUPS'}
              onChange={() => dispatch(setCommandScope('GROUPS'))}
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
          disabled={isSubmitDisabled || isMediaUploading}
          loading={formState.isSubmitting || isMediaUploading}
          style={{ width: '100%' }}
        >
          Создать команду
        </Button>
      </div>
    </>
  );
};

export default CommandForm;
