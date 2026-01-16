'use client';

import styles from './create-post.module.scss';
import Button from '@/components/button/button';
import PostSettings from '@/components/post-settings/post-settings';
import RichTextEditor from '@/components/rich-text-editor';
import InlineButtons from '@/components/inline-buttons';
import MediaPreview from '@/components/rich-text-editor/media-preview/media-preview';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import DraftsModal from '@/components/drafts-modal/drafts-modal';
import QuizForm from '@/components/quiz-form';
import {
  DraftsIcon,
  InlineButtonIcon,
  TemplatesIcon,
  QuizIcon,
  ReplyIcon,
  SettingsIcon,
  PaperclipIcon,
} from '@/components/icons';
import { useCreatePost } from './store/useCreatePost';

export default function CreatePostPage() {
  const {
    // State
    text,
    showSettings,
    showInlineButtons,
    buttonRows,
    mediaFiles,
    isPublishing,
    isSavingDraft,
    isScheduling,
    showTemplatesModal,
    showDraftsModal,
    showQuizForm,

    // Refs
    editorRef,
    fileInputRef,

    // Post Settings
    postSettings,

    // Computed
    canAddMedia,
    canShowInlineButtons,

    // Actions
    setText,
    setShowSettings,
    toggleInlineButtons,
    setButtonRows,
    handleFileUpload,
    handleRemoveMedia,
    handleToggleBlur,
    setShowTemplatesModal,
    setShowDraftsModal,
    setShowQuizForm,
    onPublishNow,
    onSaveDraft,
    handleSaveAsTemplate,
    handleSelectTemplate,
    handleSelectDraft,
    openFileDialog,
  } = useCreatePost();

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
                onSaveAsTemplate={handleSaveAsTemplate}
              />
              <div className={styles.actionsMenu}>
                <div className={styles.actionsRow}>
                  <Button
                    text="Черновики"
                    variant="templateCard"
                    showArrow={false}
                    icon={<DraftsIcon width={24} height={24} />}
                    className={styles.actionButton}
                    onClick={() => setShowDraftsModal(true)}
                  />
                  <Button
                    text="Кнопки"
                    variant="templateCard"
                    showArrow={false}
                    icon={<InlineButtonIcon width={24} height={24} />}
                    className={styles.actionButton}
                    active={showInlineButtons}
                    disabled={!canShowInlineButtons}
                    onClick={toggleInlineButtons}
                  />
                </div>
                <div className={styles.actionsRow}>
                  <Button
                    text="Шаблоны"
                    variant="templateCard"
                    showArrow={false}
                    icon={<TemplatesIcon width={24} height={24} />}
                    className={styles.actionButton}
                    onClick={() => setShowTemplatesModal(true)}
                  />
                  <Button
                    text="Опрос"
                    variant="templateCard"
                    showArrow={false}
                    icon={<QuizIcon width={24} height={24} />}
                    className={styles.actionButton}
                    active={showQuizForm}
                    onClick={() => setShowQuizForm(!showQuizForm)}
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

              {/* Quiz Form */}
              <QuizForm
                isOpen={showQuizForm}
                onClose={() => setShowQuizForm(false)}
              />

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
                    disabled={!canAddMedia}
                    onClick={openFileDialog}
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
                        disabled={!canAddMedia}
                        onClick={openFileDialog}
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
                        disabled={!canAddMedia}
                        onClick={openFileDialog}
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

      {/* Text Templates Modal */}
      <TextTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <DraftsModal
        isOpen={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
        onSelectDraft={handleSelectDraft}
      />
    </div>
  );
}
