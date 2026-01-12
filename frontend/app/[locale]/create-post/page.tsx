'use client';

import { useState, useRef } from 'react';
import styles from './create-post.module.scss';
import Button from '@/components/button/button';
import PostSettings from '@/components/post-settings/post-settings';
import { usePostSettings } from '@/components/post-settings/store';
import RichTextEditor, { RichTextEditorRef } from '@/components/rich-text-editor';
import InlineButtons, { ButtonRow } from '@/components/inline-buttons';
import MediaPreview, { type MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';
import {
  DraftsIcon,
  InlineButtonIcon,
  TemplatesIcon,
  QuizIcon,
  ReplyIcon,
  SettingsIcon,
  PaperclipIcon,
} from '@/components/icons';
import { handlePublishNow, handleSaveDraft } from './store/actions';

export default function CreatePostPage() {
  const [text, setText] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showInlineButtons, setShowInlineButtons] = useState(false);
  const [buttonRows, setButtonRows] = useState<ButtonRow[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const postSettings = usePostSettings();
  const editorRef = useRef<RichTextEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Конвертируем buttonRows в формат InlineKeyboard для бекенда
  const getInlineKeyboard = () => {
    if (buttonRows.length === 0) return undefined;
    
    const buttons = buttonRows.map(row => 
      row.buttons.map(btn => {
        const button: any = { text: btn.text };
        if (btn.type === 'url' && btn.url) {
          button.url = btn.url;
        } else if (btn.type === 'callback' && btn.callback_data) {
          button.callback_data = btn.callback_data;
        }
        return button;
      })
    );

    return { buttons };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Ограничение: если есть кнопки - максимум 1 файл, иначе 10
    const maxFiles = buttonRows.length > 0 ? 1 : 10;
    const filesToProcess = Array.from(files);
    const currentCount = mediaFiles.length;
    const availableSlots = maxFiles - currentCount;
    
    if (availableSlots <= 0) {
      event.target.value = '';
      return;
    }
    
    const filesToAdd = filesToProcess.slice(0, availableSlots);

    filesToAdd.forEach((file, index) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const type = file.type.startsWith('image/') ? 'image' 
                   : file.type.startsWith('video/') ? 'video' 
                   : 'document';
        
        // Уникальный ID с индексом файла
        const uniqueId = `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        
        setMediaFiles(prev => [...prev, {
          id: uniqueId,
          url,
          type,
          blur: false,
          file,  // Сохраняем оригинальный File объект для загрузки на сервер
        }]);
      };
      
      reader.readAsDataURL(file);
    });
    
    // Reset input
    event.target.value = '';
  };

  const handleRemoveMedia = (id: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== id));
  };

  // Переключаем blur для конкретного файла
  const handleToggleBlur = (id: string) => {
    setMediaFiles(prev => prev.map(file => 
      file.id === id ? { ...file, blur: !file.blur } : file
    ));
  };

  const onPublishNow = async () => {
    setIsPublishing(true);
    
    try {
      console.log('Publishing with:', { text, mediaFiles, settings: postSettings.getSettingsData() });
      
      const result = await handlePublishNow(
        { text },
        postSettings.getSettingsData(),
        mediaFiles,
        getInlineKeyboard()
      );

      console.log('Publish result:', result);

      if (result.success) {
        alert(result.message);
        // Сбрасываем редактор и все его состояние
        editorRef.current?.reset();
        postSettings.resetSettings();
        setButtonRows([]);
        setMediaFiles([]);
        setShowInlineButtons(false);
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
    setIsSavingDraft(true);
    try {
      const result = await handleSaveDraft(
        { text },
        postSettings.getSettingsData(),
        mediaFiles,
        getInlineKeyboard()
      );

      if (result.success) {
        alert(result.message);
      } else {
        alert(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      alert('Произошла ошибка при сохранении черновика');
      console.error(error);
    } finally {
      setIsSavingDraft(false);
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
          <RichTextEditor
            ref={editorRef}
            value={text}
            onChange={setText}
            placeholder="Напишите текст публикации..."
          />
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
                active={showInlineButtons}
                disabled={mediaFiles.length > 1}
                onClick={() => {
                  if (!showInlineButtons && buttonRows.length === 0) {
                    // При первом открытии создаём одну кнопку
                    setButtonRows([{
                      id: `row-${Date.now()}`,
                      buttons: [{
                        id: `btn-${Date.now()}`,
                        text: '',
                        type: 'url',
                        url: '',
                      }],
                    }]);
                  }
                  setShowInlineButtons(!showInlineButtons);
                }}
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
          
          {showInlineButtons && (
            <InlineButtons 
              rows={buttonRows}
              onChange={setButtonRows}
              className={styles.inlineButtonsSection}
            />
          )}

          <div className={styles.mediaSection}>
            <span className={styles.mediaSectionTitle}>Медиа и файлы</span>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            
            <div className={styles.mediaMobile}>
              <MediaPreview 
                files={mediaFiles}
                onRemove={handleRemoveMedia}
                onToggleBlur={handleToggleBlur}
              />
              
              <Button
                text="Прикрепить файл"
                variant="templateCard"
                showArrow={false}
                icon={<PaperclipIcon width={24} height={24} />}
                fullWidth
                disabled={mediaFiles.length >= 10 || (buttonRows.length > 0 && mediaFiles.length >= 1)}
                onClick={() => fileInputRef.current?.click()}
              />
            </div>
            <div className={styles.mediaDropzone}>
              {mediaFiles.length === 0 ? (
                <>
                  <span className={styles.dropzoneText}>
                    Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
                  </span>
                  <Button
                    text="Прикрепить файл"
                    variant="templateCard"
                    showArrow={false}
                    icon={<PaperclipIcon width={24} height={24} />}
                    disabled={mediaFiles.length >= 10 || (buttonRows.length > 0 && mediaFiles.length >= 1)}
                    onClick={() => fileInputRef.current?.click()}
                  />
                </>
              ) : (
                <div className={styles.mediaDropzoneContent}>
                  <MediaPreview 
                    files={mediaFiles}
                    onRemove={handleRemoveMedia}
                    onToggleBlur={handleToggleBlur}
                  />
                  <Button
                    text="Прикрепить файл"
                    variant="templateCard"
                    showArrow={false}
                    icon={<PaperclipIcon width={24} height={24} />}
                    disabled={mediaFiles.length >= 10 || (buttonRows.length > 0 && mediaFiles.length >= 1)}
                    onClick={() => fileInputRef.current?.click()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
          <div className={styles.footerButtons}>
            <Button
              text="Сохранить в черновики"
              showArrow={false}
              className={styles.saveDraftBtn}
              onClick={onSaveDraft}
              loading={isSavingDraft}
              disabled={isSavingDraft}
            />
            <div className={styles.publishRow}>
              <Button
                text="Опубликовать сейчас"
                showArrow={false}
                className={styles.publishNowBtn}
                onClick={onPublishNow}
                loading={isPublishing}
                disabled={isPublishing}
              />
              <Button
                text="Запланировать"
                showArrow={false}
                active
                loading={isScheduling}
                disabled={isScheduling}
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
            onDeleteTag={postSettings.deleteTag}
            selectedTagColor={postSettings.selectedTagColor}
            onTagColorChange={postSettings.handleTagColorChange}
            repeatInterval={postSettings.repeatInterval}
            onRepeatChange={postSettings.handleRepeatChange}
            repeatCustomDays={postSettings.repeatCustomDays}
            repeatCustomHours={postSettings.repeatCustomHours}
            onRepeatCustomDaysChange={postSettings.handleRepeatCustomDaysChange}
            onRepeatCustomHoursChange={postSettings.handleRepeatCustomHoursChange}
            autoDeleteInterval={postSettings.autoDeleteInterval}
            onAutoDeleteChange={postSettings.handleAutoDeleteChange}
            autoDeleteCustomDays={postSettings.autoDeleteCustomDays}
            autoDeleteCustomHours={postSettings.autoDeleteCustomHours}
            onAutoDeleteCustomDaysChange={postSettings.handleAutoDeleteCustomDaysChange}
            onAutoDeleteCustomHoursChange={postSettings.handleAutoDeleteCustomHoursChange}
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
              onDeleteTag={postSettings.deleteTag}
              selectedTagColor={postSettings.selectedTagColor}
              onTagColorChange={postSettings.handleTagColorChange}
              repeatInterval={postSettings.repeatInterval}
              onRepeatChange={postSettings.handleRepeatChange}
              repeatCustomDays={postSettings.repeatCustomDays}
              repeatCustomHours={postSettings.repeatCustomHours}
              onRepeatCustomDaysChange={postSettings.handleRepeatCustomDaysChange}
              onRepeatCustomHoursChange={postSettings.handleRepeatCustomHoursChange}
              autoDeleteInterval={postSettings.autoDeleteInterval}
              onAutoDeleteChange={postSettings.handleAutoDeleteChange}
              autoDeleteCustomDays={postSettings.autoDeleteCustomDays}
              autoDeleteCustomHours={postSettings.autoDeleteCustomHours}
              onAutoDeleteCustomDaysChange={postSettings.handleAutoDeleteCustomDaysChange}
              onAutoDeleteCustomHoursChange={postSettings.handleAutoDeleteCustomHoursChange}
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
