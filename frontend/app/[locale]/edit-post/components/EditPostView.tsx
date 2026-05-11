'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../edit-post.module.scss';

import { Button } from '@/components/new-button';
import Loader from '@/components/loader';
import {
  PostSettingsConnected,
  EditorHeaderConnected,
  MobileSettingsModalConnected,
} from '../../create-post/components';
import {
  PostEditorMainFields,
  PostEditorSharedModals,
  type PostEditorMainFieldsClassNames,
} from '../../create-post/components/post-editor';

import { useAppDispatch, useAppSelector } from '../../create-post/store';
import { useSelectedChannels } from '../../create-post/hooks/useSelectedChannels';
import * as uiSlice from '../../create-post/store/slices/ui';
import { useTokenFromUrl } from '../../create-post/hooks/useTokenFromUrl';
import { usePostEditorChannelEffects } from '../../create-post/hooks/usePostEditorChannelEffects';
import { useNotifications } from '@/components/notifications/NotificationProvider';

import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';

import { useEditPostLoader } from '../hooks/useEditPostLoader';
import { useScheduleState } from '../hooks/useScheduleState';
import { useSeriesEditor } from '../hooks/useSeriesEditor';
import { useEditPostActions } from '../hooks/useEditPostActions';

import DateTimeInputs from './DateTimeInputs';
import EditPostFooter from './EditPostFooter';
import SeriesPostEditor from './SeriesPostEditor';
import SharePostModal from './SharePostModal';

export default function EditPostView() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const searchParams = useSearchParams();
  const postId = searchParams?.get('post');
  const dateOverride = searchParams?.get('date');

  const loader = useEditPostLoader(postId, dateOverride);

  const id = postId ? Number(postId) : null;
  const initialSchedule = id ? loader.initialSchedules[id] ?? null : null;

  const schedule = useScheduleState(initialSchedule);

  const series = useSeriesEditor({
    seriesPosts: loader.seriesPosts,
    scheduledDate: schedule.scheduledDate,
    hours: schedule.hours,
    minutes: schedule.minutes,
    setScheduledDate: schedule.setScheduledDate,
    setHours: schedule.setHours,
    setMinutes: schedule.setMinutes,
    setShowDatePicker: schedule.setShowDatePicker,
    setShowTimePicker: schedule.setShowTimePicker,
    initialExpandedPostId: loader.expandedPostId,
    initialSchedules: loader.initialSchedules,
    showError,
  });

  const selectedChannels = useSelectedChannels();
  const activePostId = series.expandedPostId ?? (postId ? Number(postId) : null);

  const actions = useEditPostActions({
    activePostId,
    dateOverride,
    seriesId: loader.seriesId,
    seriesPosts: loader.seriesPosts,
    selectedChannels,
    scheduledDate: schedule.scheduledDate,
    hours: schedule.hours,
    minutes: schedule.minutes,
    dispatch,
    showSuccess,
    showError,
    setSeriesId: loader.setSeriesId,
    setSeriesPosts: loader.setSeriesPosts,
  });

  useTokenFromUrl();
  usePostEditorChannelEffects();

  const headerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichTextEditorRef | null>(null);
  const text = useAppSelector((state) => state.editor.text);
  const inlineButtonsOpen = useAppSelector((state) => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector((state) => state.inlineButtons.rows);
  const mediaFiles = useAppSelector((state) => state.media.files);
  const quizState = useAppSelector((state) => state.quiz);

  const hasContentForPreview =
    text.replace(/<[^>]*>/g, '').trim().length > 0 ||
    mediaFiles.length > 0 ||
    (quizState.isOpen && quizState.question.trim().length > 0) ||
    (inlineButtonsOpen && buttonRows.length > 0);

  const isSeries = loader.seriesPosts.length > 1;

  const [sharePostId, setSharePostId] = useState<number | null>(null);

  const dateTimeInputs = (
    <DateTimeInputs
      scheduledDate={schedule.scheduledDate}
      hours={schedule.hours}
      minutes={schedule.minutes}
      showDatePicker={schedule.showDatePicker}
      showTimePicker={schedule.showTimePicker}
      onToggleDatePicker={() => {
        schedule.setShowDatePicker(!schedule.showDatePicker);
        schedule.setShowTimePicker(false);
      }}
      onToggleTimePicker={() => {
        schedule.setShowTimePicker(!schedule.showTimePicker);
        schedule.setShowDatePicker(false);
      }}
      onDateChange={(date) => {
        schedule.setScheduledDate(date);
        schedule.setShowDatePicker(false);
      }}
      onHoursChange={schedule.setHours}
      onMinutesChange={schedule.setMinutes}
      datePickerRef={schedule.datePickerRef}
      timePickerRef={schedule.timePickerRef}
      recentTimes={schedule.recentTimes}
    />
  );

  const editorContent = (
    <>
      <EditorHeaderConnected className={styles.header} headerRef={headerRef} />
      <PostEditorMainFields
        styles={styles as unknown as PostEditorMainFieldsClassNames}
        headerRef={headerRef}
        editorRef={editorRef}
      />
    </>
  );

  const footer = (
    <EditPostFooter
      seriesId={loader.seriesId}
      activePostId={activePostId}
      isSaving={actions.isSaving}
      onSave={actions.handleSave}
      onMoveToDraft={actions.handleMoveToDraft}
      onDeleteFromSeries={actions.handleDeleteFromSeries}
      onShare={() => { if (activePostId) setSharePostId(activePostId); }}
    />
  );

  return (
    <div className={styles.pageWrapper}>
      {loader.isPostLoading && (
        <div className={styles.draftLoadingOverlay}>
          <Loader size={32} color="blue" />
        </div>
      )}

      <div className={styles.editHeaderWrapper}>
        <Button
          intent="gradient"
          onClick={() => { window.location.href = '/calendar'; }}
        >
          Назад в календарь
        </Button>
      </div>

      <div
        className={`${styles.mainContent} ${
          loader.isPostLoading ? styles.contentLoading : styles.contentReady
        }`}
      >
        <div className={styles.editorColumn}>
          {isSeries ? (
            <SeriesPostEditor
              seriesPosts={loader.seriesPosts}
              expandedPostId={series.expandedPostId}
              onExpandPost={series.handleExpandSeriesPost}
              dateTimeInputs={dateTimeInputs}
              editorContent={editorContent}
              footer={footer}
            />
          ) : (
            <div className={styles.editor}>
              {dateTimeInputs}
              {editorContent}
              {footer}
            </div>
          )}
        </div>
        <div className={styles.settingsPanelDesktop}>
          <PostSettingsConnected
            onPreview={() => dispatch(uiSlice.setShowPreviewModal(true))}
            previewDisabled={!hasContentForPreview}
          />
        </div>
      </div>

      <MobileSettingsModalConnected
        overlayClassName={styles.settingsModalOverlay}
        modalClassName={styles.settingsModal}
        onPreview={() => dispatch(uiSlice.setShowPreviewModal(true))}
        previewDisabled={!hasContentForPreview}
      />

      <PostEditorSharedModals editorRef={editorRef} />

      <SharePostModal
        postId={sharePostId}
        onClose={() => setSharePostId(null)}
      />
    </div>
  );
}
