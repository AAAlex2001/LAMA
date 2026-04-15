'use client';

import { useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../edit-post.module.scss';
import draftsStyles from '../../drafts/drafts.module.scss';

import Button from '@/components/button/button';
import Modal from '@/components/modal';
import Input from '@/components/input/input';
import { ShareIcon, CalendarIcon, TrashIcon, CopyIcon, TelegramCircleIcon } from '@/components/icons';
import { useShareDraftLink } from '../../drafts/hooks/useShareDraftLink';
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
import Tooltip from '@/components/tooltip/tooltip';
import Loader from '@/components/loader';
import DatePicker from '@/components/date-picker/date-picker';
import { TimePicker, useRecentTimes } from '@/components/time-picker';

import { useAppDispatch, useAppSelector } from '../../create-post/store';
import { selectSelectedChannels } from '../../create-post/store/selectors';
import * as uiSlice from '../../create-post/store/slices/ui';
import { loadDraftById } from '../../create-post/store/thunks';
import { updatePost, moveToDraft } from '../../create-post/store/thunks/updatePost';
import { useTokenFromUrl } from '../../create-post/hooks/useTokenFromUrl';
import { usePostEditorChannelEffects } from '../../create-post/hooks/usePostEditorChannelEffects';

import { apiRequest } from '../../create-post/store/thunks/api';

import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';
import { useNotifications } from '@/components/notifications/NotificationProvider';

interface SeriesPostInfo {
  id: number;
  series_order: number;
  scheduled_time: string | null;
  status: string;
}

interface SeriesPostSchedule {
  date: Date | null;
  hours: number;
  minutes: number;
}

export default function EditPostView() {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const searchParams = useSearchParams();
  const postId = searchParams?.get('post');
  const dateOverride = searchParams?.get('date');

  const [isPostLoading, setIsPostLoading] = useState(!!postId);
  const [postLoadError, setPostLoadError] = useState<string | null>(null);
  const loadedRef = useRef<string | null>(null);

  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [hours, setHours] = useState(12);
  const [minutes, setMinutes] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredShareBtn, setHoveredShareBtn] = useState(false);
  const [seriesId, setSeriesId] = useState<number | null>(null);

  const [seriesPosts, setSeriesPosts] = useState<SeriesPostInfo[]>([]);
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [seriesSchedules, setSeriesSchedules] = useState<Record<number, SeriesPostSchedule>>({});
  const [seriesLoaded, setSeriesLoaded] = useState(false);

  const [sharePost, setSharePost] = useState<{ id: number } | null>(null);
  const { shareLink, isGeneratingShareLink } = useShareDraftLink(
    sharePost as unknown as Parameters<typeof useShareDraftLink>[0],
  );

  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const recentTimes = useRecentTimes();

  useTokenFromUrl();
  usePostEditorChannelEffects();

  useEffect(() => {
    if (!postId) return;
    const id = Number(postId);
    if (!Number.isFinite(id) || id <= 0) return;
    const key = `post-${id}`;
    if (loadedRef.current === key) return;
    loadedRef.current = key;
    setIsPostLoading(true);
    setPostLoadError(null);

    dispatch(loadDraftById(id))
      .unwrap()
      .then(async (post) => {
        const schedules: Record<number, SeriesPostSchedule> = {};
        const effectiveTime = dateOverride || post.scheduled_time;
        if (effectiveTime) {
          const d = new Date(effectiveTime);
          setScheduledDate(d);
          setHours(d.getHours());
          setMinutes(d.getMinutes());
          schedules[id] = { date: d, hours: d.getHours(), minutes: d.getMinutes() };
        }
        if (post.series_id) {
          setSeriesId(post.series_id);
          setExpandedPostId(id);
          try {
            const res = await apiRequest<{ items: SeriesPostInfo[] }>(
              `/publications?series_id=${post.series_id}&page_size=50&sort_order=asc`,
            );
            const posts = [...res.items].sort(
              (a, b) => (a.series_order ?? 0) - (b.series_order ?? 0),
            );
            setSeriesPosts(posts);

            for (const sp of posts) {
              if (sp.id === id) continue;
              if (sp.scheduled_time) {
                const d = new Date(sp.scheduled_time);
                schedules[sp.id] = { date: d, hours: d.getHours(), minutes: d.getMinutes() };
              } else {
                schedules[sp.id] = { date: null, hours: 12, minutes: 0 };
              }
            }

            const otherPosts = posts.filter((sp) => sp.id !== id);
            for (const sp of otherPosts) {
              try {
                await dispatch(loadDraftById(sp.id)).unwrap();
              } catch {
                // ignore individual load errors
              }
            }
            await dispatch(loadDraftById(id)).unwrap();
            setSeriesLoaded(true);
          } catch {
            // ignore
          }
        }
        setSeriesSchedules(schedules);
      })
      .catch((err) => {
        setPostLoadError(typeof err === 'string' ? err : 'Ошибка загрузки поста');
      })
      .finally(() => {
        setIsPostLoading(false);
      });
  }, [dispatch, postId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) {
        setShowTimePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleExpandSeriesPost(spId: number) {
    if (expandedPostId === spId) return;
    setSeriesSchedules((prev) => ({
      ...prev,
      [expandedPostId!]: { date: scheduledDate, hours, minutes },
    }));
    setShowDatePicker(false);
    setShowTimePicker(false);
    try {
      await dispatch(loadDraftById(spId)).unwrap();
      setExpandedPostId(spId);
      const saved = seriesSchedules[spId];
      if (saved) {
        setScheduledDate(saved.date);
        setHours(saved.hours);
        setMinutes(saved.minutes);
      } else {
        setScheduledDate(null);
        setHours(12);
        setMinutes(0);
      }
    } catch {
      showError('Ошибка загрузки поста');
    }
  }

  const headerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RichTextEditorRef | null>(null);
  const text = useAppSelector((state) => state.editor.text);
  const inlineButtonsOpen = useAppSelector((state) => state.inlineButtons.isOpen);
  const buttonRows = useAppSelector((state) => state.inlineButtons.rows);
  const mediaFiles = useAppSelector((state) => state.media.files);
  const quizState = useAppSelector((state) => state.quiz);
  const selectedChannels = useAppSelector(selectSelectedChannels);

  const hasContentForPreview =
    text.replace(/<[^>]*>/g, '').trim().length > 0 ||
    mediaFiles.length > 0 ||
    (quizState.isOpen && quizState.question.trim().length > 0) ||
    (inlineButtonsOpen && buttonRows.length > 0);

  const formatDate = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTimeDisplay = () => {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const activePostId = expandedPostId ?? (postId ? Number(postId) : null);

  async function handleSave() {
    if (!activePostId) return;
    const channelIds = selectedChannels.map((c) => c.id);
    const scheduledDateTime = scheduledDate ? new Date(scheduledDate) : new Date();
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    setIsSaving(true);
    const result = await dispatch(
      updatePost({ postId: activePostId, channelIds, scheduledDate: scheduledDateTime }),
    );
    if (updatePost.fulfilled.match(result)) {
      showSuccess('Изменения сохранены!');
      setTimeout(() => { window.location.href = '/calendar'; }, 1500);
    } else if (updatePost.rejected.match(result)) {
      showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения');
    }
    setIsSaving(false);
  }

  async function handleMoveToDraft() {
    if (!activePostId) return;

    if (dateOverride) {
      try {
        const dateStr = new Date(dateOverride).toISOString().slice(0, 10);
        await apiRequest(
          `/publications/${activePostId}?repeat_mode=this&repeat_date=${dateStr}`,
          { method: 'DELETE' },
        );
        showSuccess('Повтор на эту дату исключён');
        setTimeout(() => { window.location.href = '/calendar'; }, 1500);
      } catch {
        showError('Ошибка исключения повтора');
      }
      return;
    }

    if (seriesId && seriesPosts.length > 0) {
      try {
        for (const sp of seriesPosts) {
          await dispatch(moveToDraft(sp.id)).unwrap();
        }
        showSuccess('Серия перенесена в черновики');
        setTimeout(() => { window.location.href = '/drafts'; }, 1500);
      } catch {
        showError('Ошибка переноса в черновики');
      }
    } else {
      const result = await dispatch(moveToDraft(activePostId));
      if (moveToDraft.fulfilled.match(result)) {
        showSuccess('Пост перенесён в черновики');
        setTimeout(() => { window.location.href = '/drafts'; }, 1500);
      } else if (moveToDraft.rejected.match(result)) {
        showError(typeof result.payload === 'string' ? result.payload : 'Ошибка');
      }
    }
  }

  async function handleDeleteFromSeries() {
    if (!seriesId) return;
    try {
      await apiRequest(`/publications/series/${seriesId}`, { method: 'DELETE' });
      setSeriesId(null);
      setSeriesPosts([]);
      showSuccess('Серия постов удалена');
      setTimeout(() => { window.location.href = '/calendar'; }, 1500);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка');
    }
  }

  const isSeries = seriesPosts.length > 1;

  const chevronIcon = (expanded: boolean) => (
    <svg
      className={`${styles.seriesChevron} ${expanded ? styles.seriesChevronExpanded : ''}`}
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="#000000"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const dateTimeInputs = (
    <div className={styles.dateTimeRow}>
      <div className={styles.dateInputWrapper} ref={datePickerRef}>
        <div
          className={styles.dateInput}
          onClick={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }}
        >
          <CalendarIcon width={18} height={18} color="#3B82F6" />
          <span className={styles.dateInputText}>
            {formatDateDisplay(scheduledDate) || 'Выберите дату'}
          </span>
        </div>
        {showDatePicker && (
          <div className={styles.datePickerDropdown}>
            <DatePicker
              value={scheduledDate ?? undefined}
              onChange={(date) => { setScheduledDate(date); setShowDatePicker(false); }}
              locale="ru"
              selectedDates={scheduledDate ? [scheduledDate.getDate()] : []}
            />
          </div>
        )}
      </div>

      <div className={styles.timeInputWrapper} ref={timePickerRef}>
        <div
          className={styles.timeInput}
          onClick={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18.5a8.5 8.5 0 110-17 8.5 8.5 0 010 17zm.75-8.69V7.5a.75.75 0 00-1.5 0v4.69l-2.72 2.72a.75.75 0 001.06 1.06l2.91-2.91a.75.75 0 00.25-.56z" fill="#3B82F6"/>
          </svg>
          <span className={styles.timeInputText}>{formatTimeDisplay()}</span>
        </div>
        {showTimePicker && (
          <div className={styles.timePickerDropdown}>
            <TimePicker
              hours={hours}
              minutes={minutes}
              onHoursChange={setHours}
              onMinutesChange={setMinutes}
              selectedDate={scheduledDate}
              quickTimes={recentTimes}
            />
          </div>
        )}
      </div>
    </div>
  );

  const editorContent = (
    <>
      <EditorHeaderConnected
        className={styles.header}
        headerRef={headerRef}
      />
      <PostEditorMainFields
        styles={styles as unknown as PostEditorMainFieldsClassNames}
        headerRef={headerRef}
        editorRef={editorRef}
      />
    </>
  );

  const footerButtons = (
    <div className={styles.footerButtons}>
      {seriesId && (
        <Button
          text="Удалить из серии"
          variant="delete"
          showArrow={false}
          icon={<TrashIcon width={15} height={16.67} />}
          className={styles.deleteSeriesBtn}
          onClick={handleDeleteFromSeries}
        />
      )}
      <Button
        text="Перенести в черновик"
        variant="outline"
        showArrow={false}
        className={styles.moveToDraftBtn}
        onClick={handleMoveToDraft}
      />
      <div className={styles.rightButtons}>
        <button
          type="button"
          className={styles.shareBtn}
          aria-label="Поделиться"
          onMouseEnter={() => setHoveredShareBtn(true)}
          onMouseLeave={() => setHoveredShareBtn(false)}
          onClick={() => {
            if (activePostId) setSharePost({ id: activePostId });
          }}
          disabled={!activePostId}
        >
          <ShareIcon width={24} height={24} color="#B0B4B8" />
          {hoveredShareBtn && <Tooltip text="Поделиться" />}
        </button>
        <Button
          text="Сохранить изменения"
          showArrow={false}
          active
          className={styles.saveBtn}
          onClick={handleSave}
          loading={isSaving}
          disabled={isSaving}
        />
      </div>
    </div>
  );

  const seriesEditor = (
    <div className={styles.editor}>
      <h2 className={styles.seriesTitle}>Редактирование поста</h2>

      {seriesPosts.map((sp, idx) => {
        const isExpanded = expandedPostId === sp.id;
        const isPublished = sp.status === 'published' || sp.status === 'partial_success';
        return (
          <div
            key={sp.id}
            className={`${styles.seriesPostTab} ${isExpanded ? styles.seriesPostTabExpanded : ''} ${isPublished ? styles.seriesPostTabDisabled : ''}`}
            onClick={!isExpanded && !isPublished ? () => handleExpandSeriesPost(sp.id) : undefined}
          >
            <div className={styles.seriesPostHeader}>
              <span className={styles.seriesPostName}>Пост {idx + 1}</span>
              {isPublished && (
                <span className={styles.seriesPostPublished}>Опубликован</span>
              )}
              {!isExpanded && !isPublished && (
                <div className={styles.seriesPostMeta}>
                  <span className={styles.seriesPostDate}>{formatDate(sp.scheduled_time)}</span>
                  <span className={styles.seriesPostTime}>{formatTime(sp.scheduled_time)}</span>
                </div>
              )}
              {!isPublished && chevronIcon(isExpanded)}
            </div>

            {isExpanded && !isPublished && (
              <div className={styles.seriesPostContent}>
                {dateTimeInputs}
                {editorContent}
              </div>
            )}
          </div>
        );
      })}

      {footerButtons}
    </div>
  );

  const singleEditor = (
    <div className={styles.editor}>
      {dateTimeInputs}
      {editorContent}
      {footerButtons}
    </div>
  );

  return (
    <div className={styles.pageWrapper}>
      {isPostLoading && (
        <div className={styles.draftLoadingOverlay}>
          <Loader size={32} color="blue" />
        </div>
      )}

      <div className={styles.editHeaderWrapper}>
        <Button
          text="Назад в календарь"
          showArrow={false}
          active
          onClick={() => { window.location.href = '/calendar'; }}
        />
      </div>

      <div
        className={`${styles.mainContent} ${
          isPostLoading ? styles.contentLoading : styles.contentReady
        }`}
      >
        <div className={styles.editorColumn}>
          {isSeries ? seriesEditor : singleEditor}
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

      <div className={draftsStyles.shareModal}>
        <Modal
          isOpen={!!sharePost}
          onClose={() => setSharePost(null)}
          onConfirm={() => setSharePost(null)}
          title="Поделиться постом"
          hideButtons
        >
          <div className={draftsStyles.shareModalContent}>
            <p className={draftsStyles.shareDescription}>
              Вы можете скопировать ссылку и отправить её удобным способом или нажать на иконку Telegram, после чего выбрать чат и поделиться ссылкой напрямую.<br /><br />
              <strong>Внимание:</strong> ссылка действительна <strong>7 дней</strong> и может быть использована <strong>только один раз</strong>.
            </p>
            <div className={draftsStyles.shareLinkRow}>
              <div className={draftsStyles.shareLinkInput}>
                <Input
                  value={shareLink}
                  onChange={() => {}}
                  variant="white"
                  icon={<CopyIcon width={24} height={24} color="#000000" />}
                  iconDisabled={isGeneratingShareLink || !shareLink}
                  onIconClick={() => {
                    if (!isGeneratingShareLink && shareLink) {
                      navigator.clipboard.writeText(shareLink);
                      showSuccess('Ссылка скопирована!');
                    }
                  }}
                />
                {isGeneratingShareLink && (
                  <div className={draftsStyles.shareLinkLoader}>
                    <Loader size={16} color="blue" />
                  </div>
                )}
              </div>
              <button
                type="button"
                className={draftsStyles.telegramBtn}
                onClick={() => {
                  if (!isGeneratingShareLink && shareLink) {
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
                  }
                }}
                disabled={isGeneratingShareLink || !shareLink}
              >
                <TelegramCircleIcon width={32} height={32} color="#1E1E1E" />
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
