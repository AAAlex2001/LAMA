'use client';

import { useRef, useEffect } from 'react';
import styles from './create-post.module.scss';

import Button from '@/components/button/button';
import PostSettings from '@/components/post-settings/post-settings';
import RichTextEditor from '@/components/rich-text-editor/rich-text-editor.container';
import MediaPreview from '@/components/media-preview/media-preview';
import {
  QuizFormConnected,
  InlineButtonsConnected,
  DraftsModalConnected,
  TemplatesModalConnected,
  ReplyModalConnected,
  DatePickerModalConnected,
} from './components';
import Toggle from '@/components/toggle/toggle';
import PostPreviewModal from '@/components/post-preview-modal';
import PostAccordion from '@/components/post-accordion/post-accordion';
import { hasPlainUrlLikeText } from '@/components/rich-text-editor/editor/link-utils';
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

import { CreatePostProvider } from './store/provider';
import { useAppDispatch, useAppSelector } from './store';
import * as editorSlice from './store/slices/editor';
import * as mediaSlice from './store/slices/media';
import * as inlineButtonsSlice from './store/slices/inlineButtons';
import * as quizSlice from './store/slices/quiz';
import * as settingsSlice from './store/slices/settings';
import * as uiSlice from './store/slices/ui';
import {
  saveDraft,
  fetchDrafts,
  fetchTemplates,
  fetchPosts,
  saveAsTemplate,
} from './store/thunks';
import { selectPollData } from './store/slices/quiz';
import { usePublishHandlers } from './hooks/usePublishHandlers';
import { useCreatePostHandlers } from './hooks/useCreatePostHandlers';

import { useChannels } from '@/stores/channels';
import { useTags } from '@/stores/tags';
import { useNotifications } from '@/components/notifications/NotificationProvider';

import type { MediaFile as MediaPreviewFile } from '@/components/media-preview/media-preview';
import type { RepeatOption, RepeatCustomUnit, AutoDeleteOption, TagColor } from './store/types';

function CreatePostPageContent() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const headerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);

  const text = useAppSelector(state => state.editor.text);
  const showLinkPreview = useAppSelector(state => state.editor.showLinkPreview);
  const mediaFiles = useAppSelector(state => state.media.files);
  const inlineButtonsOpen = useAppSelector(state => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector(state => state.inlineButtons.rows);
  const quizState = useAppSelector(state => state.quiz);
  const quizOpen = quizState.isOpen;
  const quizMode = quizState.mode;
  const quizQuestion = quizState.question;
  const quizAnswers = quizState.answers;
  const quizCorrectAnswerId = quizState.correctAnswerId;
  const selectedTagName = useAppSelector(state => state.settings.selectedTagName);
  const selectedTagColor = useAppSelector(state => state.settings.selectedTagColor);
  const notifySubscribers = useAppSelector(state => state.settings.notifySubscribers);
  const pinPost = useAppSelector(state => state.settings.pinPost);
  const showCreateChannel = useAppSelector(state => state.settings.showCreateChannel);
  const repeatInterval = useAppSelector(state => state.settings.repeatInterval);
  const repeatCustomDays = useAppSelector(state => state.settings.repeatCustomDays);
  const repeatCustomHours = useAppSelector(state => state.settings.repeatCustomHours);
  const repeatCustomUnit = useAppSelector(state => state.settings.repeatCustomUnit);
  const repeatCustomValue = useAppSelector(state => state.settings.repeatCustomValue);
  const repeatWeekdays = useAppSelector(state => state.settings.repeatWeekdays);
  const repeatMonthDays = useAppSelector(state => state.settings.repeatMonthDays);
  const repeatYearMonth = useAppSelector(state => state.settings.repeatYearMonth);
  const repeatYearDays = useAppSelector(state => state.settings.repeatYearDays);
  const repeatEndType = useAppSelector(state => state.settings.repeatEndType);
  const repeatEndDate = useAppSelector(state => state.settings.repeatEndDate);
  const autoDeleteInterval = useAppSelector(state => state.settings.autoDeleteInterval);
  const autoDeleteCustomDays = useAppSelector(state => state.settings.autoDeleteCustomDays);
  const autoDeleteCustomHours = useAppSelector(state => state.settings.autoDeleteCustomHours);
  const showPreviewModal = useAppSelector(state => state.ui.showPreviewModal);
  const showMobileSettings = useAppSelector(state => state.ui.showMobileSettings);
  const isPublishing = useAppSelector(state => state.ui.isPublishing);
  const isSavingDraft = useAppSelector(state => state.ui.isSavingDraft);
  const isScheduling = useAppSelector(state => state.ui.isScheduling);
  const snapshots = useAppSelector(state => state.series.snapshots);
  const activeIndex = useAppSelector(state => state.series.activeIndex);
  const pollData = selectPollData(quizState);

  const channelsStore = useChannels();
  const tagsStore = useTags();

  const replyToPostState = useAppSelector(state => state.replyToPost);

  const canAddMedia = buttonRows.length > 0 ? mediaFiles.length < 1 : mediaFiles.length < 10;
  const canShowInlineButtons = mediaFiles.length <= 1;
  const selectedChannels = channelsStore.channels.filter(c => c.selected);
  const selectedCount = selectedChannels.length;
  const canReplyToPost = selectedCount === 1;
  const primaryChannel = selectedChannels.length > 0 ? selectedChannels[0] : undefined;
  const channelExtraCount = selectedCount > 1 ? `+${selectedCount - 1}` : undefined;
  
  const hasContentForPreview = 
    text.replace(/<[^>]*>/g, '').trim().length > 0 ||
    mediaFiles.length > 0 ||
    (quizOpen && quizQuestion.trim().length > 0) ||
    (inlineButtonsOpen && buttonRows.length > 0);

  const quizPreviewMode = quizMode === 'quiz' ? 'quiz' : 'poll';
  
  const quizPreviewData = quizOpen && quizQuestion.trim() ? {
    mode: quizPreviewMode as 'quiz' | 'poll',
    question: quizQuestion,
    options: quizAnswers.map(a => a.text),
    isAnonymous: true,
    allowsMultipleAnswers: quizMode === 'poll_multi',
    correctAnswerIndex: quizMode === 'quiz' && quizCorrectAnswerId
      ? quizAnswers.findIndex(a => a.id === quizCorrectAnswerId)
      : undefined,
  } : undefined;

  const inlineKeyboardPreview = inlineButtonsOpen && buttonRows.length > 0 ? {
    buttons: buttonRows
      .map(row => row.buttons.filter(btn => btn.text.trim()).map(btn => ({ text: btn.text, type: btn.type })))
      .filter(row => row.length > 0),
  } : undefined;

  const channelOptions = channelsStore.channels.map(ch => ({
    id: String(ch.id),
    label: ch.title,
    checked: ch.selected,
    members_count: ch.members_count,
    photo_url: ch.photo_url,
  }));

  useEffect(() => {
    dispatch(settingsSlice.setReplyToPostId(replyToPostState.selectedPost?.id ?? null));
  }, [dispatch, replyToPostState.selectedPost]);

  useEffect(() => {
    channelsStore.fetchChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    handleFileUpload,
    handleMoveMedia,
    handleChannelChange,
    handleAddChannel,
    handleSelectTag,
    handleSelectPostSnapshot,
    handleAddSeries,
  } = useCreatePostHandlers({
    dispatch,
    channelsStore,
    text,
    mediaFiles,
    inlineButtonsOpen,
    buttonRows,
    quizOpen,
    quizMode,
    quizQuestion,
    quizAnswers,
    quizCorrectAnswerId,
    showLinkPreview,
    snapshots,
  });

  const { handlePublishNow, handlePublishSeries } = usePublishHandlers({
    dispatch,
    selectedChannels,
    text,
    mediaFiles,
    pollData,
    snapshots,
    activeIndex,
    inlineButtonsOpen,
    buttonRows,
    quizOpen,
    quizMode,
    quizQuestion,
    quizAnswers,
    quizCorrectAnswerId,
    showLinkPreview,
  });
  
  const postSettingsProps = {
    channelOptions,
    channelsLoading: channelsStore.loading,
    channelsSyncing: channelsStore.syncing,
    selectedCount,
    totalChannels: channelsStore.channels.length,
    showCreateChannel,
    onFetchChannels: channelsStore.fetchChannels,
    onChannelChange: handleChannelChange,
    onAddChannel: handleAddChannel,
    onOpenCreateChannel: () => dispatch(settingsSlice.setShowCreateChannel(true)),
    onCloseCreateChannel: () => dispatch(settingsSlice.setShowCreateChannel(false)),
    recentTags: tagsStore.recentTags.map(tag => ({ ...tag, color: tag.color || '#808080' })),
    searchResults: tagsStore.searchResults.map(tag => ({ ...tag, color: tag.color || '#808080' })),
    tagInputValue: tagsStore.tagInputValue,
    selectedTagName,
    selectedTagColor,
    tagsLoading: tagsStore.loading,
    tagsSearching: tagsStore.searching,
    onLoadRecentTags: tagsStore.loadRecentTags,
    onSearchTags: tagsStore.searchTags,
    onTagInputChange: tagsStore.setTagInputValue,
    onSelectTag: handleSelectTag,
    onDeleteTag: (name: string) => {
      const tag = tagsStore.recentTags.find(t => t.name === name);
      if (tag) tagsStore.deleteTag(tag.id);
    },
    onTagColorChange: (color: TagColor) => dispatch(settingsSlice.setSelectedTagColor(color)),
    repeatInterval,
    repeatCustomDays,
    repeatCustomHours,
    repeatCustomUnit,
    repeatCustomValue,
    repeatWeekdays,
    repeatMonthDays,
    repeatYearMonth,
    repeatYearDays,
    repeatEndType,
    repeatEndDate: repeatEndDate ? new Date(repeatEndDate) : null,
    onRepeatChange: (v: RepeatOption) => dispatch(settingsSlice.setRepeatInterval(v)),
    onRepeatCustomDaysChange: (v: number) => dispatch(settingsSlice.setRepeatCustomDays(v)),
    onRepeatCustomHoursChange: (v: number) => dispatch(settingsSlice.setRepeatCustomHours(v)),
    onRepeatCustomUnitChange: (v: RepeatCustomUnit) => dispatch(settingsSlice.setRepeatCustomUnit(v)),
    onRepeatCustomValueChange: (v: number) => dispatch(settingsSlice.setRepeatCustomValue(v)),
    onRepeatWeekdaysChange: (v: number[]) => dispatch(settingsSlice.setRepeatWeekdays(v)),
    onRepeatMonthDaysChange: (v: number[]) => dispatch(settingsSlice.setRepeatMonthDays(v)),
    onRepeatYearMonthChange: (v: number) => dispatch(settingsSlice.setRepeatYearMonth(v)),
    onRepeatYearDaysChange: (v: number[]) => dispatch(settingsSlice.setRepeatYearDays(v)),
    onRepeatEndTypeChange: (v: 'never' | 'date') => dispatch(settingsSlice.setRepeatEndType(v)),
    onRepeatEndDateChange: (v: Date | null) => dispatch(settingsSlice.setRepeatEndDate(v?.toISOString() ?? null)),
    autoDeleteInterval,
    autoDeleteCustomDays,
    autoDeleteCustomHours,
    onAutoDeleteChange: (v: AutoDeleteOption) => dispatch(settingsSlice.setAutoDeleteInterval(v)),
    onAutoDeleteCustomDaysChange: (v: number) => dispatch(settingsSlice.setAutoDeleteCustomDays(v)),
    onAutoDeleteCustomHoursChange: (v: number) => dispatch(settingsSlice.setAutoDeleteCustomHours(v)),
    notifySubscribers,
    pinPost,
    onNotifyChange: (v: boolean) => dispatch(settingsSlice.setNotifySubscribers(v)),
    onPinChange: (v: boolean) => dispatch(settingsSlice.setPinPost(v)),
    onReset: () => { dispatch(settingsSlice.resetSettings()); tagsStore.reset(); },
  };

  const editorBlock = (
    <div className={styles.editor}>
      <div className={styles.header} ref={headerRef}>
        <div className={styles.headerTag}>
          {selectedTagName && (
            <div className={styles.headerTagButton} style={{ backgroundColor: selectedTagColor }}>
              <span className={styles.headerTagText}>{selectedTagName}</span>
              <button type="button" className={styles.headerTagClose} onClick={() => dispatch(settingsSlice.clearTag())} aria-label="Удалить тег">
                <CloseIcon width={12} height={12} color="#000000" />
              </button>
            </div>
          )}
        </div>
        <button className={styles.settingsButton} type="button" aria-label="Настройки" onClick={() => dispatch(uiSlice.setShowMobileSettings(!showMobileSettings))}>
          <SettingsIcon width={24} height={24} />
        </button>
      </div>

      <div className={styles.content}>
        <RichTextEditor ref={editorRef} value={text} onChange={(v) => dispatch(editorSlice.setText(v))} placeholder="Напишите текст публикации..." onSaveAsTemplate={(html) => {
          dispatch(saveAsTemplate(html)).then((result) => {
            if (result.meta.requestStatus === 'fulfilled') {
              showSuccess('Шаблон успешно сохранён');
            } else if (result.meta.requestStatus === 'rejected') {
              showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения шаблона');
            }
          });
        }} headerRef={headerRef} />

        {text && hasPlainUrlLikeText(text) && (
          <div className={styles.linkPreviewToggle}>
            <span className={styles.linkPreviewLabel}>Показать превью ссылки</span>
            <Toggle checked={showLinkPreview} onChange={(v) => dispatch(editorSlice.setShowLinkPreview(v))} />
          </div>
        )}

        <div className={styles.actionsMenu}>
          <div className={styles.actionsRow}>
            <Button text="Черновики" variant="templateCard" showArrow={false} icon={<DraftsIcon width={24} height={24} />} className={styles.actionButton} onClick={() => { dispatch(uiSlice.setShowDraftsModal(true)); dispatch(fetchDrafts()); }} />
            <Button text="Кнопки" variant="templateCard" showArrow={false} icon={<InlineButtonIcon width={24} height={24} />} className={styles.actionButton} active={inlineButtonsOpen} disabled={!canShowInlineButtons} onClick={() => dispatch(inlineButtonsSlice.toggle())} />
          </div>
          <div className={styles.actionsRow}>
            <Button text="Шаблоны" variant="templateCard" showArrow={false} icon={<TemplatesIcon width={24} height={24} />} className={styles.actionButton} onClick={() => { dispatch(uiSlice.setShowTemplatesModal(true)); dispatch(fetchTemplates()); }} />
            <Button text="Опрос" variant="templateCard" showArrow={false} icon={<QuizIcon width={24} height={24} />} className={styles.actionButton} active={quizOpen} onClick={() => dispatch(quizSlice.setOpen(!quizOpen))} />
          </div>
          <div className={styles.actionsRowCenter}>
            <Button text="Ответ на свой пост" variant="templateCard" showArrow={false} icon={<ReplyIcon width={24} height={24} />} className={styles.actionButtonCenter} disabled={!canReplyToPost} onClick={() => { if (primaryChannel) { dispatch(uiSlice.setShowReplyModal(true)); dispatch(fetchPosts(primaryChannel.id)); }}} />
          </div>
        </div>

        <InlineButtonsConnected className={styles.inlineButtonsSection} />

        <QuizFormConnected />

        <div className={styles.mediaSection}>
          <span className={styles.mediaSectionTitle}>Медиа и файлы</span>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          <div className={styles.mediaMobile}>
            <MediaPreview files={mediaFiles as MediaPreviewFile[]} onRemove={(id) => dispatch(mediaSlice.removeFile(id))} onToggleBlur={(id) => dispatch(mediaSlice.toggleBlur(id))} onMove={handleMoveMedia} />
            <Button text="Прикрепить файл" variant="templateCard" showArrow={false} icon={<PaperclipIcon width={24} height={24} />} fullWidth disabled={!canAddMedia} onClick={() => fileInputRef.current?.click()} />
          </div>
          <div className={styles.mediaDropzone}>
            {mediaFiles.length === 0 ? (
              <>
                <span className={styles.dropzoneText}>Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»</span>
                <Button text="Прикрепить файл" variant="templateCard" showArrow={false} icon={<PaperclipIcon width={24} height={24} />} disabled={!canAddMedia} onClick={() => fileInputRef.current?.click()} />
              </>
            ) : (
              <div className={styles.mediaDropzoneContent}>
                <MediaPreview files={mediaFiles as MediaPreviewFile[]} onRemove={(id) => dispatch(mediaSlice.removeFile(id))} onToggleBlur={(id) => dispatch(mediaSlice.toggleBlur(id))} onMove={handleMoveMedia} />
                <Button text="Прикрепить файл" variant="templateCard" showArrow={false} icon={<PaperclipIcon width={24} height={24} />} disabled={!canAddMedia} onClick={() => fileInputRef.current?.click()} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footerButtons}>
        <Button text="Сохранить в черновики" showArrow={false} className={styles.saveDraftBtn} onClick={() => dispatch(saveDraft(selectedChannels.map(c => c.id)))} loading={isSavingDraft} disabled={isSavingDraft} />
        <div className={styles.publishRow}>
          <Button text="Опубликовать сейчас" showArrow={false} className={styles.publishNowBtn} onClick={() => { snapshots.length > 1 ? handlePublishSeries() : handlePublishNow(); }} loading={isPublishing} disabled={isPublishing} />
          <Button text="Запланировать" showArrow={false} active loading={isScheduling} disabled={isScheduling} className={styles.scheduleBtn} onClick={() => dispatch(uiSlice.setShowDatePickerModal(true))} />
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.mainContent}>
        <div className={styles.editorColumn}>
          {snapshots.length > 1 ? (
            <div className={styles.seriesList}>
              {snapshots.map((_, index) => (
                <PostAccordion key={`post-${index + 1}`} title={`Пост ${index + 1}`} isOpen={index === activeIndex} onToggle={() => handleSelectPostSnapshot(index)}>
                  {index === activeIndex ? editorBlock : null}
                </PostAccordion>
              ))}
            </div>
          ) : editorBlock}
          <Button text="Добавить серию постов" showArrow={false} className={styles.addSeriesBtn} onClick={handleAddSeries} />
        </div>
        <div className={styles.settingsPanelDesktop}>
          <PostSettings onPreview={() => dispatch(uiSlice.setShowPreviewModal(true))} previewDisabled={!hasContentForPreview} {...postSettingsProps} />
        </div>
      </div>

      {showMobileSettings && (
        <div className={styles.settingsModalOverlay} onClick={() => dispatch(uiSlice.setShowMobileSettings(false))}>
          <div className={styles.settingsModal} onClick={e => e.stopPropagation()}>
            <PostSettings onPreview={() => dispatch(uiSlice.setShowPreviewModal(true))} previewDisabled={!hasContentForPreview} {...postSettingsProps} />
          </div>
        </div>
      )}

      <PostPreviewModal isOpen={showPreviewModal} onClose={() => dispatch(uiSlice.setShowPreviewModal(false))} channelTitle={primaryChannel?.title} channelExtraCount={channelExtraCount} channelPhotoUrl={primaryChannel?.photo_url} channelMembersCount={primaryChannel?.members_count} html={text} mediaFiles={mediaFiles as MediaPreviewFile[]} quizData={quizPreviewData} inlineKeyboard={inlineKeyboardPreview} />
      
      <DraftsModalConnected />
      <TemplatesModalConnected />
      <ReplyModalConnected />
      <DatePickerModalConnected />
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <CreatePostProvider>
      <CreatePostPageContent />
    </CreatePostProvider>
  );
}
