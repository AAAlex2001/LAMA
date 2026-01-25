'use client';

import { useRef, useState } from 'react';
import styles from './create-post.module.scss';
import Button from '@/components/button/button';
import PostSettings from '@/components/post-settings/post-settings';
import RichTextEditor from '@/components/rich-text-editor';
import InlineButtons from '@/components/inline-buttons';
import MediaPreview from '@/components/media-preview';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import DraftsModal from '@/components/drafts-modal/drafts-modal';
import ReplyToPostModal from '@/components/reply-to-post-modal/reply-to-post-modal';
import { DatePickerModal } from '@/components/date-picker';
import QuizForm from '@/components/quiz-form';
import Toggle from '@/components/toggle/toggle';
import Dropdown from '@/components/dropdown/dropdown';
import PostPreviewModal, { type QuizPreviewData } from '@/components/post-preview-modal';
import { hasPlainUrlLikeText } from '@/components/rich-text-editor/editor/link-utils';
import PostAccordion from '@/components/post-accordion/post-accordion';
import { initialQuizFormState } from '@/components/quiz-form/store/reducer';
import { useTokenFromUrl } from './hooks/useTokenFromUrl';
import {
  DraftsIcon,
  InlineButtonIcon,
  TemplatesIcon,
  QuizIcon,
  ReplyIcon,
  SettingsIcon,
  PaperclipIcon,
  CloseIcon,
} from '@/components/icons';

// Контексты
import { useRichTextEditor } from '@/components/rich-text-editor';
import { useMediaPreview } from '@/components/media-preview';
import { useInlineButtons } from '@/components/inline-buttons';
import { useQuizForm } from '@/components/quiz-form';
import { useDrafts } from '@/components/drafts-modal';
import { useTemplates } from '@/components/text-templates-modal';
import { useReplyToPost } from '@/components/reply-to-post-modal';
import { useDatePicker } from '@/components/date-picker';
import { usePostSettingsContext } from '@/components/post-settings/store';
import { useCreatePostContext, type PostSnapshot } from './store/CreatePostContext';

const EMPTY_POST_SNAPSHOT: PostSnapshot = {
  text: '',
  showInlineButtons: false,
  buttonRows: [],
  mediaFiles: [],
  showQuizForm: false,
  quizForm: initialQuizFormState,
  showLinkPreview: false,
};

function CreatePostPageContent() {
  // Автоматически сохраняем токен из URL если он есть
  useTokenFromUrl();
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [postSnapshots, setPostSnapshots] = useState<PostSnapshot[]>([EMPTY_POST_SNAPSHOT]);
  const [activePostIndex, setActivePostIndex] = useState(0);
  // selected tag is read from postSettings.selectedTagName
  
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Контексты компонентов
  const richTextEditor = useRichTextEditor();
  const mediaPreview = useMediaPreview();
  const inlineButtons = useInlineButtons();
  const quizForm = useQuizForm();
  const drafts = useDrafts();
  const templates = useTemplates();
  const replyToPosts = useReplyToPost();
  const datePicker = useDatePicker();
  const postSettings = usePostSettingsContext();
  
  // Главный контекст создания поста
  const {
    isPublishing,
    isSavingDraft,
    isScheduling,
    showLinkPreview,
    setShowLinkPreview,
    showMobileSettings,
    setShowMobileSettings,
    fileInputRef,
    openFileDialog,
    handleFileUpload,
    publishNow,
    publishSeriesNow,
    saveDraft,
    saveAsTemplate,
    getSnapshot,
    loadSnapshot,
    resetForm,
    handleSelectTemplate,
    handleSelectDraft,
    handleSelectPost: handleSelectPostFromContext,
    canAddMedia,
    canShowInlineButtons,
    hasContentForPreview,
  } = useCreatePostContext();
  
  // Channel info for preview
  const selectedChannels = postSettings.channelOptions.filter((c) => c.checked);
  const selectedPrimaryChannel = selectedChannels[0];
  const extraSelectedCount = Math.max(0, postSettings.selectedCount - 1);
  const selectedChannelTitle = `${selectedPrimaryChannel?.label || 'Название канала'}${
    extraSelectedCount > 0 ? ` +${extraSelectedCount}` : ''
  }`;
  const canReplyToPost = selectedChannels.length === 1;
  
  // Quiz preview data
  const getQuizPreviewData = (): QuizPreviewData | undefined => {
    const pollData = quizForm.getPollData();
    if (!pollData) return undefined;
    
    return {
      mode: pollData.is_quiz ? 'quiz' : 'poll',
      question: pollData.question,
      options: pollData.options,
      isAnonymous: true,
      allowsMultipleAnswers: pollData.allows_multiple_answers || false,
      correctAnswerIndex: pollData.correct_option_id,
    };
  };
  
  const quizPreviewData = getQuizPreviewData();

  // tag selection handled in PostSettings store (postSettings.selectedTagName)
  
  const handleRemoveTag = () => {
    postSettings.setSelectedTagName('');
  };
  
  const handleOpenPreview = () => {
    setShowMobileSettings(false);
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
    resetForm();
  };
  
  const handlePublishClick = async () => {
    if (postSnapshots.length <= 1) {
      await publishNow();
      return;
    }
    
    const currentSnapshot = getSnapshot();
    const snapshotsForPublish = postSnapshots.map((p, idx) => 
      idx === activePostIndex ? currentSnapshot : p
    );
    
    const result = await publishSeriesNow(snapshotsForPublish);
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
        <div className={styles.headerTag}>
          {postSettings.selectedTagName ? (
            <div
              className={styles.headerTagButton}
              style={{ backgroundColor: postSettings.selectedTagColor}}
            >
              <span className={styles.headerTagText}>{postSettings.selectedTagName}</span>
              <button
                type="button"
                className={styles.headerTagClose}
                onClick={handleRemoveTag}
                aria-label="Удалить тег"
              >
                <CloseIcon width={12} height={12} color="#000000" />
              </button>
            </div>
          ) : null}
        </div>
        <button
          className={styles.settingsButton}
          type="button"
          aria-label="Настройки"
          onClick={() => setShowMobileSettings(!showMobileSettings)}
        >
          <SettingsIcon width={24} height={24} />
        </button>
      </div>
      
      <div className={styles.content}>
        <RichTextEditor
          ref={richTextEditor.editorRef}
          value={richTextEditor.text}
          onChange={richTextEditor.setText}
          placeholder="Напишите текст публикации..."
          onSaveAsTemplate={saveAsTemplate}
          headerRef={headerRef}
        />
        
        {richTextEditor.text && hasPlainUrlLikeText(richTextEditor.text) && (
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
              onClick={drafts.open}
            />
            <Button
              text="Кнопки"
              variant="templateCard"
              showArrow={false}
              icon={<InlineButtonIcon width={24} height={24} />}
              className={styles.actionButton}
              active={inlineButtons.isOpen}
              disabled={!canShowInlineButtons}
              onClick={inlineButtons.toggle}
            />
          </div>
          <div className={styles.actionsRow}>
            <Button
              text="Шаблоны"
              variant="templateCard"
              showArrow={false}
              icon={<TemplatesIcon width={24} height={24} />}
              className={styles.actionButton}
              onClick={templates.open}
            />
            <Button
              text="Опрос"
              variant="templateCard"
              showArrow={false}
              icon={<QuizIcon width={24} height={24} />}
              className={styles.actionButton}
              active={quizForm.isOpen}
              onClick={quizForm.toggle}
            />
          </div>
          <div className={styles.actionsRowCenter}>
            <Button
              text="Ответ на свой пост"
              variant="templateCard"
              showArrow={false}
              icon={<ReplyIcon width={24} height={24} />}
              className={styles.actionButtonCenter}
              disabled={!canReplyToPost}
              onClick={() => {
                if (!canReplyToPost) return;
                const channelId = Number(selectedPrimaryChannel?.id);
                if (!Number.isFinite(channelId)) return;
                replyToPosts.open(channelId);
              }}
            />
          </div>
        </div>
        
        <InlineButtons className={styles.inlineButtonsSection} />
        
        <QuizForm />
        
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
            <MediaPreview />
            
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
            {mediaPreview.files.length === 0 ? (
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
                <MediaPreview />
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
          onClick={saveDraft}
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
            onClick={() => datePicker.open()}
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
            onPreview={handleOpenPreview}
            previewDisabled={!hasContentForPreview}
          />
        </div>
      </div>
      
      {/* Mobile Settings Modal */}
      {showMobileSettings && (
        <div className={styles.settingsModalOverlay} onClick={() => setShowMobileSettings(false)}>
          <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
            <PostSettings
              onPreview={handleOpenPreview}
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
        html={richTextEditor.text}
        mediaFiles={mediaPreview.files}
        quizData={quizPreviewData}
      />
      
      {/* Text Templates Modal */}
      <TextTemplatesModal onSelectTemplate={handleSelectTemplate} />
      
      <DraftsModal onSelectDraft={handleSelectDraft} />
      
      <ReplyToPostModal />
      
      <DatePickerModal />
    </div>
  );
}

// Экспортируем обёрнутую страницу
import { CreatePostProvider } from './store/CreatePostContext';

export default function CreatePostPage() {
  return (
    <CreatePostProvider>
      <CreatePostPageContent />
    </CreatePostProvider>
  );
}
