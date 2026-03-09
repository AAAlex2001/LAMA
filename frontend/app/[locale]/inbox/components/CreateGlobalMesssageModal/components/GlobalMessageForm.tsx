'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/new-button';
import styles from '../styles.module.scss';
import type { GlobalMessageFormData } from '../index';
import {
  useAppDispatch,
  useAppSelector,
  setCreateGlobalMessageModalOpen,
  setTextContent,
  setMediaUrl,
  setMediaType,
  resetGlobalMessageForm,
  setGlobalMessageBotSearch,
  toggleGlobalMessageSelectedBotId,
} from '../../../store';
import { selectBots, selectBotsLoading, selectGlobalMessageIsLoading } from '../../../store/selectors';
import BotSearchSelector from '../../BotSearchSelector';
import ResponseTextSection, { type ResponseTextSectionRef } from '../../ResponseTextSection';
import { uploadMediaFile } from '@/app/[locale]/create-post/store/thunks/api';
import { API_BASE_URL } from '@/app/[locale]/create-post/store/thunks/api';
import { buildInlineKeyboard } from '@/app/[locale]/create-post/store/thunks/utils';
import { useRef } from 'react';

interface GlobalMessageFormProps {
  onSubmit: (data: GlobalMessageFormData) => void;
  onCancel: () => void;
  onShowCreateBot?: () => void;
  maxBots?: number;
  hideSearchBar?: boolean;
  bots?: Array<{ id: number; username?: string; title?: string }>;
}

const GlobalMessageForm: React.FC<GlobalMessageFormProps> = ({
  onSubmit,
  onShowCreateBot,
  hideSearchBar = false,
  bots: propBots,
}) => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.createGlobalMessageModal);
  const storeBots = useAppSelector((state) => selectBots(state));
  const botsLoading = useAppSelector((state) => selectBotsLoading(state));
  const bots = propBots || storeBots;
  const botSearch = formState.botSearch;
  const selectedBotIds = useMemo(() => new Set(formState.selectedBotIds), [formState.selectedBotIds]);
  const responseTextSectionRef = useRef<ResponseTextSectionRef>(null);
  const [hasMediaFiles, setHasMediaFiles] = useState(false);
  const isLoading = useAppSelector((state) => selectGlobalMessageIsLoading(state));
  useEffect(() => {
    dispatch(setCreateGlobalMessageModalOpen(true));
    return () => {
      dispatch(resetGlobalMessageForm());
    };
  }, [dispatch]);

  const handleSubmit = async () => {
    const { limitedMediaFiles, inlineButtonRows } = responseTextSectionRef.current || { limitedMediaFiles: [], inlineButtonRows: [] };
    
    if (!formState.text_content.trim()) {
      return;
    }
    
    // Use prop bots directly if provided, otherwise fall back to Redux selection
    const botIds = propBots
      ? propBots.map(bot => bot.id)
      : formState.selectedBotIds
          .map(id => {
            const parsed = parseInt(id, 10);
            return isNaN(parsed) ? null : parsed;
          })
          .filter((id): id is number => id !== null);

    if (botIds.length === 0) {
      return;
    }

    let mediaUrl = formState.media_url.trim();

    if (limitedMediaFiles.length > 0 && limitedMediaFiles[0].file && !limitedMediaFiles[0].url) {
      try {
        const uploaded = await uploadMediaFile(limitedMediaFiles[0].file);
        const baseUrl = API_BASE_URL.replace('/api', '');
        mediaUrl = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
      } catch (error) {
        console.error('Failed to upload media:', error);
        return;
      }
    }

    const inlineKeyboard = buildInlineKeyboard(inlineButtonRows);

    onSubmit({
      text_content: formState.text_content.trim() || undefined,
      media_url: mediaUrl || undefined,
      inline_keyboard: inlineKeyboard,
      botIds,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSubmitDisabled = !formState.text_content.trim() && !hasMediaFiles;

  return (
    <>
      { !hideSearchBar && (
        <BotSearchSelector
          bots={bots || []}
          searchValue={botSearch}
          onSearchChange={(value) => dispatch(setGlobalMessageBotSearch(value))}
          selectedBotIds={selectedBotIds}
          onBotToggle={(botId) => dispatch(toggleGlobalMessageSelectedBotId(botId))}
          isLoading={botsLoading}
          // maxBots={maxBots}
          onShowCreateBot={onShowCreateBot}
        />
      )}
      <ResponseTextSection
        ref={responseTextSectionRef}
        responseText={formState.text_content}
        onResponseTextChange={(value) => dispatch(setTextContent(value))}
        onKeyDown={handleKeyDown}
        onMediaTypeChange={(mediaType) => dispatch(setMediaType(mediaType))}
        onMediaUrlChange={(mediaUrl) => dispatch(setMediaUrl(mediaUrl))}
        onMediaFilesChange={setHasMediaFiles}
      />

      <div className={styles.submitButtonContainer}>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          onClick={handleSubmit}
          className={styles.submitButton}
          disabled={isSubmitDisabled || isLoading}
          loading={isLoading}
          style={{ width: '100%' }}
        >
          Отправить сообщение
        </Button>
      </div>
    </>
  );
};

export default GlobalMessageForm;
