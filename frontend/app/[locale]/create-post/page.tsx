'use client';
import { useRef, useState } from 'react';
import styles from './create-post.module.scss';
import Button from '@/components/button/button';
import PostSettings from '@/components/post-settings/post-settings';
import RichTextEditor from '@/components/rich-text-editor';
import InlineButtons from '@/components/inline-buttons';
import MediaPreview from '@/components/rich-text-editor/media-preview/media-preview';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import DraftsModal from '@/components/drafts-modal/drafts-modal';
import QuizForm from '@/components/quiz-form';
import Toggle from '@/components/toggle/toggle';
import PostPreviewModal, { type QuizPreviewData } from '@/components/post-preview-modal';
import { hasLink } from '@/components/rich-text-editor/editor/link-utils';
import PostAccordion from '@/components/post-accordion/post-accordion';
import { initialQuizFormState } from '@/components/quiz-form/store/reducer';
import {
  DraftsIcon,
  InlineButtonIcon,
  TemplatesIcon,
  QuizIcon,
  ReplyIcon,
  SettingsIcon,
  PaperclipIcon,
} from '@/components/icons';
import { useCreatePost, type CreatePostSnapshot } from './store/useCreatePost';

const EMPTY_POST_SNAPSHOT: CreatePostSnapshot = {
  text: '',
  showInlineButtons: false,
  buttonRows: [],
  mediaFiles: [],
  showQuizForm: false,
  quizForm: initialQuizFormState,
  showLinkPreview: false,
};

export default function CreatePostPage() {
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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
    showLinkPreview,

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
    setShowLinkPreview,
    quizFormState,
    quizFormDispatch,
    onPublishNow,
    onPublishSeriesNow,
    onSaveDraft,
    handleSaveAsTemplate,
    handleSelectTemplate,
    handleSelectDraft,
    openFileDialog,
    getSnapshot,
    loadSnapshot,
    resetForm,
  } = useCreatePost();

  const [postSnapshots, setPostSnapshots] = useState<CreatePostSnapshot[]>([EMPTY_POST_SNAPSHOT]);
  const [activePostIndex, setActivePostIndex] = useState(0);

  const headerRef = useRef<HTMLDivElement>(null);

  const selectedPrimaryChannel = postSettings.channelOptions.find((c) => c.checked);
  const extraSelectedCount = Math.max(0, postSettings.selectedCount - 1);
  const selectedChannelTitle = `${selectedPrimaryChannel?.label || 'Название канала'}${
    extraSelectedCount > 0 ? ` +${extraSelectedCount}` : ''
  }`;

  // Преобразуем quizFormState в QuizPreviewData
  const getQuizPreviewData = (): QuizPreviewData | undefined => {
    const question = quizFormState.question.trim();
    if (!question) return undefined;

    const filledOptions = quizFormState.answers
      .map((a) => a.text.trim())
      .filter((t) => t.length > 0);

    if (filledOptions.length < 2) return undefined;

    const isQuiz = quizFormState.mode === 'quiz';
    let correctAnswerIndex: number | undefined;
    if (isQuiz && quizFormState.correctAnswerId) {
      const idx = quizFormState.answers.findIndex((a) => a.id === quizFormState.correctAnswerId);
      if (idx >= 0) correctAnswerIndex = idx;
    }

    return {
      mode: isQuiz ? 'quiz' : 'poll',
      question,
      options: filledOptions,
      isAnonymous: true,
      allowsMultipleAnswers: quizFormState.mode === 'poll_multi',
      correctAnswerIndex,
    };
  };

  const quizPreviewData = getQuizPreviewData();
  const hasContentForPreview = text || mediaFiles.length > 0 || quizPreviewData;

  const handleOpenPreview = () => {
    setShowSettings(false);
    setShowPreviewModal(true);
  };

  const handleAddSeries = () => {
    const currentSnapshot = getSnapshot();
    const nextIndex = postSnapshots.length;

    setPostSnapshots((prev) => {
      const next = [...prev];
      next[activePostIndex] = currentSnapshot;
      next.push(EMPTY_POST_SNAPSHOT);
      return next;
    });

    setActivePostIndex(nextIndex);
    resetForm({ preserveMediaUrls: true });
  };

  const handlePublishClick = async () => {
    if (postSnapshots.length <= 1) {
      await onPublishNow();
      return;
    }

    const currentSnapshot = getSnapshot();
    const snapshotsForPublish = postSnapshots.map((p, idx) => (idx === activePostIndex ? currentSnapshot : p));

    const result = await onPublishSeriesNow(snapshotsForPublish);
    if (result?.success) {
      setPostSnapshots([EMPTY_POST_SNAPSHOT]);
      setActivePostIndex(0);
    }
  };

  const handleSelectPost = (index: number) => {
    if (index === activePostIndex) return;

    const currentSnapshot = getSnapshot();
    const targetSnapshot = postSnapshots[index] ?? EMPTY_POST_SNAPSHOT;

    setPostSnapshots((prev) => {
      const next = [...prev];
      next[activePostIndex] = currentSnapshot;
      return next;
    });

    setActivePostIndex(index);
    loadSnapshot(targetSnapshot);
  };

  const editorBlock = (
    <div className={styles.editor}>
      <div className={styles.header} ref={headerRef}>
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
          headerRef={headerRef}
        />

        {text && hasLink(text) && (
          <div className={styles.linkPreviewToggle}>
            <span className={styles.linkPreviewLabel}>Показать превью ссылки</span>
            <Toggle checked={showLinkPreview} onChange={setShowLinkPreview} />
          </div>
        )}
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
              onClick={() => {
                const next = !showQuizForm;
                setShowQuizForm(next);
              }}
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

        <QuizForm isOpen={showQuizForm} state={quizFormState} dispatch={quizFormDispatch} />

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
            <MediaPreview files={mediaFiles} onRemove={handleRemoveMedia} onToggleBlur={handleToggleBlur} />

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
                <MediaPreview files={mediaFiles} onRemove={handleRemoveMedia} onToggleBlur={handleToggleBlur} />
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
            onClick={handlePublishClick}
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
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.mainContent}>
        <div className={styles.editorColumn}>
          {postSnapshots.length > 1 ? (
            <div className={styles.seriesList}>
              {postSnapshots.map((_, index) => (
                <PostAccordion
                  key={`post-${index + 1}`}
                  title={`Пост ${index + 1}`}
                  isOpen={index === activePostIndex}
                  onToggle={() => handleSelectPost(index)}
                >
                  {index === activePostIndex ? editorBlock : null}
                </PostAccordion>
              ))}
            </div>
          ) : (
            editorBlock
          )}

          <Button
            text="Добавить серию постов"
            showArrow={false}
            className={styles.addSeriesBtn}
            onClick={handleAddSeries}
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
            onPreview={handleOpenPreview}
            onReset={postSettings.resetSettings}
            previewDisabled={!hasContentForPreview}
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
              onPreview={handleOpenPreview}
              onReset={postSettings.resetSettings}
              previewDisabled={!hasContentForPreview}
            />
          </div>
        </div>
      )}

      <PostPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        channelTitle={selectedChannelTitle}
        channelPhotoUrl={selectedPrimaryChannel?.photo_url}
        channelMembersCount={selectedPrimaryChannel?.members_count}
        html={text}
        mediaFiles={mediaFiles}
        quizData={quizPreviewData}
      />

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
