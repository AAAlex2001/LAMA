'use client';

import React, { useEffect, useState } from 'react';
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
import { selectBots, selectBotsLoading } from '../../../store/selectors';
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
  isLoading?: boolean;
}

const GlobalMessageForm: React.FC<GlobalMessageFormProps> = ({
  onSubmit,
  onShowCreateBot,
  hideSearchBar = false,
  bots: propBots,
  isLoading = false,
}) => {
  const dispatch = useAppDispatch();
  const formState = useAppSelector((state) => state.createGlobalMessageModal);
  const storeBots = useAppSelector((state) => selectBots(state));
  const botsLoading = useAppSelector((state) => selectBotsLoading(state));
  const bots = propBots || storeBots;
  const botSearch = formState.botSearch;
  const selectedBotIds =  new Set(formState.selectedBotIds);
  const responseTextSectionRef = useRef<ResponseTextSectionRef>(null);
  const [hasMediaFiles, setHasMediaFiles] = useState(false);
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

    const inlineKeyboard = buildInlineKeyboard(inlineButtonRows);

    onSubmit({
      text_content: formState.text_content.trim() || undefined,
      media_url: mediaUrls[0] || undefined,
      media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
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
