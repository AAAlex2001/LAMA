'use client';

import React, { useEffect, useRef } from 'react';
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
  setBotSearch,
  toggleSelectedBotId,
} from '../../../store';
import { selectBots, selectBotsLoading } from '../../../store/selectors';
import BotSearchSelector from '../../BotSearchSelector';
import ResponseTextSection, { type ResponseTextSectionRef } from '../../ResponseTextSection';
import { uploadMediaFile } from '@/app/[locale]/create-post/store/thunks/api';
import { API_BASE_URL } from '@/app/[locale]/create-post/store/thunks/api';
import { buildInlineKeyboard } from '@/app/[locale]/create-post/store/thunks/utils';

interface AutoReplyFormProps {
  onSubmit: (data: AutoReplyFormData) => void;
  onCancel: () => void;
  maxBots?: number;
  onShowCreateBot?: () => void;
}

const AutoReplyForm: React.FC<AutoReplyFormProps> = ({ 
  onSubmit, 
  onCancel, 
  maxBots = 0,
  onShowCreateBot,
}) => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.createAutoReplyModal);
  const bots = useAppSelector((state) => selectBots(state));
  const botsLoading = useAppSelector((state) => selectBotsLoading(state));
  const botSearch = formState.botSearch;
  const selectedBotIds = new Set(formState.selectedBotIds);
  const responseTextSectionRef = useRef<ResponseTextSectionRef>(null);

  useEffect(() => {
    dispatch(setCreateAutoReplyModalOpen(true));
    return () => {
      dispatch(resetAutoReplyForm());
    };
  }, [dispatch]);

  const handleSubmit = async () => {
    const validKeywords = formState.keywords.filter(k => k.trim()).map(k => k.trim());
    if (validKeywords.length === 0 || !formState.response_text.trim()) {
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
      keywords: validKeywords,
      response_text: formState.response_text.trim(),
      response_media_url: mediaUrls[0] || undefined,
      response_media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
      response_media_type: formState.response_media_type,
      response_buttons: inlineButtons,
      botIds: Array.from(selectedBotIds).map(id => parseInt(id)),
      scope: formState.scope,
      is_active: formState.is_active,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const validKeywords = formState.keywords.filter(k => k.trim());
  const isSubmitDisabled = validKeywords.length === 0 || !formState.response_text.trim();

  return (
    <>
      <BotSearchSelector
        bots={bots || []}
        searchValue={botSearch}
        onSearchChange={(value) => dispatch(setBotSearch(value))}
        selectedBotIds={selectedBotIds}
        onBotToggle={(botId) => dispatch(toggleSelectedBotId(botId))}
        isLoading={botsLoading}
        // maxBots={maxBots}
        onShowCreateBot={onShowCreateBot}
      />
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

      <ResponseTextSection
        ref={responseTextSectionRef}
        responseText={formState.response_text}
        onResponseTextChange={(value) => dispatch(setResponseText(value))}
        onKeyDown={handleKeyDown}
        onMediaTypeChange={(mediaType) => dispatch(setResponseMediaType(mediaType))}
        onMediaUrlChange={(mediaUrl) => dispatch(setResponseMediaUrl(mediaUrl))}
      />

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
              checked={formState.scope === 'GROUPS'}
              onChange={() => dispatch(setAutoReplyScope('GROUPS'))}
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
          style={{ width: '100%' }}
        >
          Создать автоответ
        </Button>
      </div>
    </>
  );
};

export default AutoReplyForm;
