'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './create-post.module.scss';
import Button from '@/components/button/button';
import PostSettings from '@/components/post-settings/post-settings';
import { usePostSettings } from '@/components/post-settings/store';
import {
  DraftsIcon,
  InlineButtonIcon,
  TemplatesIcon,
  QuizIcon,
  ReplyIcon,
  SettingsIcon,
  AiEditIcon,
  EmojiIcon,
  PaperclipIcon,
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  QuoteIcon,
  CodeIcon,
  BlurIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from '@/components/icons';
import { handlePublishNow, handleSaveDraft } from './store/actions';

const MAX_CHARS = 4096;

export default function CreatePostPage() {
  const [text, setText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const postSettings = usePostSettings();

  const charCount = text.length;

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [text]);

  const onPublishNow = async () => {
    setIsPublishing(true);
    
    try {
      const result = await handlePublishNow(
        { text },
        postSettings.getSettingsData()
      );

      if (result.success) {
        alert(result.message);
        setText('');
      } else {
        alert(`Ошибка: ${result.message}`);
        if (result.errors) {
          console.error('Детали ошибок:', result.errors);
        }
      }
    } catch (error) {
      alert('Произошла ошибка при публикации');
      console.error(error);
    } finally {
      setIsPublishing(false);
    }
  };

  const onSaveDraft = async () => {
    try {
      const result = await handleSaveDraft(
        { text },
        postSettings.getSettingsData()
      );

      if (result.success) {
        alert(result.message);
      } else {
        alert(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      alert('Произошла ошибка при сохранении черновика');
      console.error(error);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.mainContent}>
        <div className={styles.editorColumn}>
          <div className={styles.editor}>
            <div className={styles.header}>
              <span className={styles.headerTitle}>Новая публикация</span>
              <button
                className={styles.settingsButton}
                type="button"
                aria-label="Настройки"
                onClick={() => setShowSettings(!showSettings)}
              >
                <SettingsIcon width={24} height={24} />
              </button>
            </div>

          <div className={styles.content}>
          <div className={styles.textareaWrapper}>
            <div className={styles.textareaInner}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder="Напишите текст публикации..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_CHARS}
              />
            </div>
            <div className={styles.textareaFooter}>
              <div className={styles.textareaTools}>
                <button className={`${styles.toolButton} ${styles.desktopOnly}`} type="button" aria-label="Жирный">
                  <BoldIcon width={21} height={21} />
                </button>
                <button className={`${styles.toolButton} ${styles.desktopOnly}`} type="button" aria-label="Курсив">
                  <ItalicIcon width={21} height={21} />
                </button>
                <button className={`${styles.toolButton} ${styles.desktopOnly}`} type="button" aria-label="Ссылка">
                  <LinkIcon width={21} height={21} />
                </button>
                <button className={`${styles.toolButton} ${styles.desktopOnly}`} type="button" aria-label="Цитата">
                  <QuoteIcon width={21} height={21} />
                </button>
                <button className={`${styles.toolButton} ${styles.desktopOnly}`} type="button" aria-label="Код">
                  <CodeIcon width={21} height={21} />
                </button>
                <button className={`${styles.toolButton} ${styles.desktopOnly}`} type="button" aria-label="Блюр">
                  <BlurIcon width={21} height={21} />
                </button>
                <button className={`${styles.toolButton} ${styles.desktopOnly}`} type="button" aria-label="Перечеркнутый">
                  <StrikethroughIcon width={21} height={21} />
                </button>
                <button className={`${styles.toolButton} ${styles.desktopOnly}`} type="button" aria-label="Подчеркнутый">
                  <UnderlineIcon width={21} height={21} />
                </button>
                <button className={styles.toolButton} type="button" aria-label="AI редактирование">
                  <AiEditIcon width={21} height={21} />
                </button>
                <button className={styles.toolButton} type="button" aria-label="Эмодзи">
                  <EmojiIcon width={21} height={21} />
                </button>
              </div>
              <div className={styles.charCountWrapper}>
                <button className={styles.toolButton} type="button" aria-label="Подсчет символов">
                  <TemplatesIcon width={21} height={21} />
                </button>
                <span className={styles.charCount}>{charCount}/{MAX_CHARS}</span>
              </div>
            </div>
          </div>
          <div className={styles.actionsMenu}>
            <div className={styles.actionsRow}>
              <Button
                text="Черновики"
                variant="templateCard"
                showArrow={false}
                icon={<DraftsIcon width={24} height={24} />}
                className={styles.actionButton}
              />
              <Button
                text="Кнопки"
                variant="templateCard"
                showArrow={false}
                icon={<InlineButtonIcon width={24} height={24} />}
                className={styles.actionButton}
              />
            </div>
            <div className={styles.actionsRow}>
              <Button
                text="Шаблоны"
                variant="templateCard"
                showArrow={false}
                icon={<TemplatesIcon width={24} height={24} />}
                className={styles.actionButton}
              />
              <Button
                text="Опрос"
                variant="templateCard"
                showArrow={false}
                icon={<QuizIcon width={24} height={24} />}
                className={styles.actionButton}
              />
            </div>
            <div className={styles.actionsRowCenter}>
              <Button
                text="Ответ на свой пост"
                variant="templateCard"
                showArrow={false}
                icon={<ReplyIcon width={24} height={24} />}
                className={styles.actionButtonCenter}
              />
            </div>
          </div>
          <div className={styles.mediaSection}>
            <span className={styles.mediaSectionTitle}>Медиа и файлы</span>
            <div className={styles.mediaMobile}>
              <Button
                text="Прикрепить файл"
                variant="templateCard"
                showArrow={false}
                icon={<PaperclipIcon width={24} height={24} />}
                fullWidth
              />
            </div>
            <div className={styles.mediaDropzone}>
              <span className={styles.dropzoneText}>
                Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
              </span>
              <Button
                text="Прикрепить файл"
                variant="templateCard"
                showArrow={false}
                icon={<PaperclipIcon width={24} height={24} />}
              />
            </div>
          </div>
        </div>
          <div className={styles.footerButtons}>
            <Button
              text="Сохранить в черновики"
              showArrow={false}
              className={styles.saveDraftBtn}
              onClick={onSaveDraft}
            />
            <div className={styles.publishRow}>
              <Button
                text={isPublishing ? "Публикуем..." : "Опубликовать сейчас"}
                showArrow={false}
                className={styles.publishNowBtn}
                onClick={onPublishNow}
              />
              <Button
                text="Запланировать"
                showArrow={false}
                active
                className={styles.scheduleBtn}
              />
            </div>
          </div>
          </div>

          <Button
            text="Добавить серию постов"
            showArrow={false}
            className={styles.addSeriesBtn}
          />
        </div>

        <div className={styles.settingsPanelDesktop}>
          <PostSettings 
            channelOptions={postSettings.channelOptions}
            channelsLoading={postSettings.channelsLoading}
            channelsSyncing={postSettings.channelsSyncing}
            selectedCount={postSettings.selectedCount}
            totalChannels={postSettings.totalChannels}
            onFetchChannels={postSettings.fetchChannels}
            onChannelChange={postSettings.handleChannelChange}
            onAddChannelClick={postSettings.openCreateChannel}
            recentTags={postSettings.recentTags}
            searchResults={postSettings.searchResults}
            tagInputValue={postSettings.tagInputValue}
            tagsLoading={postSettings.tagsLoading}
            tagsSearching={postSettings.tagsSearching}
            onLoadRecentTags={postSettings.loadRecentTags}
            onSearchTags={postSettings.searchTags}
            onTagInputChange={postSettings.setTagInputValue}
            onSelectTag={postSettings.selectTag}
            repeatInterval={postSettings.repeatInterval}
            onRepeatChange={postSettings.handleRepeatChange}
            notifySubscribers={postSettings.notifySubscribers}
            onNotifyChange={postSettings.handleNotifyChange}
            pinPost={postSettings.pinPost}
            onPinChange={postSettings.handlePinChange}
            showCreateChannel={postSettings.showCreateChannel}
            onAddChannel={postSettings.handleAddChannel}
            onCloseCreateChannel={postSettings.closeCreateChannel}
            onReset={postSettings.resetSettings}
          />
        </div>
      </div>

      {/* Mobile Settings Modal */}
      {showSettings && (
        <div className={styles.settingsModalOverlay} onClick={() => setShowSettings(false)}>
          <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
            <PostSettings
              channelOptions={postSettings.channelOptions}
              channelsLoading={postSettings.channelsLoading}
              channelsSyncing={postSettings.channelsSyncing}
              selectedCount={postSettings.selectedCount}
              totalChannels={postSettings.totalChannels}
              onFetchChannels={postSettings.fetchChannels}
              onChannelChange={postSettings.handleChannelChange}
              onAddChannelClick={postSettings.openCreateChannel}
              recentTags={postSettings.recentTags}
              searchResults={postSettings.searchResults}
              tagInputValue={postSettings.tagInputValue}
              tagsLoading={postSettings.tagsLoading}
              tagsSearching={postSettings.tagsSearching}
              onLoadRecentTags={postSettings.loadRecentTags}
              onSearchTags={postSettings.searchTags}
              onTagInputChange={postSettings.setTagInputValue}
              onSelectTag={postSettings.selectTag}
              repeatInterval={postSettings.repeatInterval}
              onRepeatChange={postSettings.handleRepeatChange}
              notifySubscribers={postSettings.notifySubscribers}
              onNotifyChange={postSettings.handleNotifyChange}
              pinPost={postSettings.pinPost}
              onPinChange={postSettings.handlePinChange}
              showCreateChannel={postSettings.showCreateChannel}
              onAddChannel={postSettings.handleAddChannel}
              onCloseCreateChannel={postSettings.closeCreateChannel}
              onReset={postSettings.resetSettings}
            />
          </div>
        </div>
      )}
    </div>
  );
}
