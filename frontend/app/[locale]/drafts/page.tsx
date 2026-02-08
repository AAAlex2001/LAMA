'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { DraftsProvider } from './store/provider';
import { useAppDispatch, useAppSelector } from './store';
import { fetchDrafts, fetchMoreDrafts, deleteDraftThunk } from './store/thunks';
import Button from '@/components/button/button';
import Loader from '@/components/loader';
import Modal from '@/components/modal';
import PostPreviewModal from '@/components/post-preview-modal';
import { ChevronDownIcon, SortClearIcon } from '@/components/icons';
import { getAccessToken } from '@/app/[locale]/register/store/actions';
import DraftCard from './components/DraftCard';
import type { Draft, MediaFile } from '@/app/[locale]/create-post/store/types';
import styles from './drafts.module.scss';

function getMediaType(url: string): 'image' | 'video' | 'document' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  return 'document';
}

function draftToMediaFiles(draft: Draft): MediaFile[] {
  if (!draft.media_urls?.length) return [];
  return draft.media_urls.map((url, index) => ({
    id: `draft-media-${draft.id}-${index}`,
    url,
    type: getMediaType(url),
    blur: draft.media_blur?.[index] ?? false,
    thumbnail_url: draft.media_thumbnail_urls?.[index] ?? null,
    telegram_file_id: draft.media_file_ids?.[index] ?? null,
  }));
}

function DraftsPageContent() {
  const dispatch = useAppDispatch();
  const drafts = useAppSelector(state => state.drafts.items);
  const isLoading = useAppSelector(state => state.drafts.isLoading);
  const isLoadingMore = useAppSelector(state => state.drafts.isLoadingMore);
  const hasMore = useAppSelector(state => state.drafts.hasMore);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);
  const [openSort, setOpenSort] = useState<'date' | 'tags' | 'source' | null>(null);
  const defaultSortByDate = 'По дате создания';
  const defaultSortByTags = 'По тегам';
  const defaultSortBySource = 'По источнику';
  const [sortByDate, setSortByDate] = useState(defaultSortByDate);
  const [sortByTags, setSortByTags] = useState(defaultSortByTags);
  const [sortBySource, setSortBySource] = useState(defaultSortBySource);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchDrafts());
  }, [dispatch]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = document.documentElement;
    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !isLoadingMore) {
      dispatch(fetchMoreDrafts());
    }
  }, [dispatch, hasMore, isLoadingMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (!openSort) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (sortBarRef.current && !sortBarRef.current.contains(event.target as Node)) {
        setOpenSort(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openSort]);

  const confirmDelete = () => {
    if (deleteConfirmId !== null) {
      dispatch(deleteDraftThunk(deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const previewData = useMemo(() => {
    if (!previewDraft) return null;
    const channel = previewDraft.channels?.[0];
    const extraCount = previewDraft.channels?.length > 1
      ? `+${previewDraft.channels.length - 1}`
      : undefined;
    return {
      channelTitle: channel?.title,
      channelPhotoUrl: channel?.photo_url,
      channelMembersCount: channel?.members_count,
      channelExtraCount: extraCount,
      html: previewDraft.formatted_content?.text || previewDraft.text_content || '',
      mediaFiles: draftToMediaFiles(previewDraft),
      inlineKeyboard: previewDraft.inline_keyboard?.buttons?.length
        ? { buttons: previewDraft.inline_keyboard.buttons }
        : undefined,
      quizData: previewDraft.poll_data?.question ? {
        mode: (previewDraft.poll_data.is_quiz ? 'quiz' : 'poll') as 'quiz' | 'poll',
        question: previewDraft.poll_data.question,
        options: previewDraft.poll_data.options,
        isAnonymous: previewDraft.poll_data.is_anonymous ?? true,
        allowsMultipleAnswers: previewDraft.poll_data.allows_multiple_answers ?? false,
        correctAnswerIndex: previewDraft.poll_data.correct_option_id ?? undefined,
      } : undefined,
    };
  }, [previewDraft]);

  const token = getAccessToken() || undefined;
  const showPageLoader = isLoading && drafts.length === 0;

  const handleShare = (draft: Draft) => {
    const text = draft.formatted_content?.text || draft.text_content || '';
    const plainText = text.replace(/<[^>]*>/g, '');
    if (navigator.share) {
      navigator.share({ text: plainText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(plainText).catch(() => {});
    }
  };

  const handleEdit = (draft: Draft) => {
    window.location.href = `create-post?draft=${draft.id}`;
  };

  const dateOptions = [defaultSortByDate, 'Сначала новые', 'Сначала старые'];
  const tagOptions = [defaultSortByTags, 'Все', 'Без тегов'];
  const sourceOptions = [defaultSortBySource, 'Все', 'Из парсера', 'Созданы мной'];
  const isDateActive = sortByDate !== defaultSortByDate;
  const isTagsActive = sortByTags !== defaultSortByTags;
  const isSourceActive = sortBySource !== defaultSortBySource;

  return (
    <div className={styles.page} ref={scrollRef}>
      {showPageLoader && (
        <div className={styles.pageLoader}>
          <Loader size={32} color="blue" />
        </div>
      )}
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.sortBar} ref={sortBarRef}>
            <span className={styles.sortLabel}>Сортировка:</span>
            <div className={styles.sortGroup}>
              <div className={styles.sortDropdown}>
                <button
                  type="button"
                  className={isDateActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
                  onClick={() => setOpenSort(openSort === 'date' ? null : 'date')}
                >
                  <span className={styles.sortButtonText}>{sortByDate}</span>
                  <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
                  {isDateActive && (
                    <span
                      className={styles.sortClear}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSortByDate(defaultSortByDate);
                      }}
                    >
                      <SortClearIcon />
                    </span>
                  )}
                </button>
                {openSort === 'date' && (
                  <div className={styles.sortMenu}>
                    {dateOptions.map(option => (
                      <button
                        key={option}
                        type="button"
                        className={styles.sortOption}
                        onClick={() => {
                          setSortByDate(option);
                          setOpenSort(null);
                        }}
                      >
                        <span
                          className={
                            option === sortByDate
                              ? `${styles.sortRadio} ${styles.sortRadioActive}`
                              : styles.sortRadio
                          }
                        >
                          <span className={styles.sortRadioDot} />
                        </span>
                        <span className={styles.sortOptionText}>{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.sortDropdown}>
                <button
                  type="button"
                  className={isTagsActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
                  onClick={() => setOpenSort(openSort === 'tags' ? null : 'tags')}
                >
                  <span className={styles.sortButtonText}>{sortByTags}</span>
                  <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
                  {isTagsActive && (
                    <span
                      className={styles.sortClear}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSortByTags(defaultSortByTags);
                      }}
                    >
                      <SortClearIcon />
                    </span>
                  )}
                </button>
                {openSort === 'tags' && (
                  <div className={styles.sortMenu}>
                    {tagOptions.map(option => (
                      <button
                        key={option}
                        type="button"
                        className={styles.sortOption}
                        onClick={() => {
                          setSortByTags(option);
                          setOpenSort(null);
                        }}
                      >
                        <span
                          className={
                            option === sortByTags
                              ? `${styles.sortRadio} ${styles.sortRadioActive}`
                              : styles.sortRadio
                          }
                        >
                          <span className={styles.sortRadioDot} />
                        </span>
                        <span className={styles.sortOptionText}>{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.sortDropdown}>
                <button
                  type="button"
                  className={isSourceActive ? `${styles.sortButton} ${styles.sortButtonActive}` : styles.sortButton}
                  onClick={() => setOpenSort(openSort === 'source' ? null : 'source')}
                >
                  <span className={styles.sortButtonText}>{sortBySource}</span>
                  <ChevronDownIcon className={styles.sortChevron} width={16} height={16} />
                  {isSourceActive && (
                    <span
                      className={styles.sortClear}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSortBySource(defaultSortBySource);
                      }}
                    >
                      <SortClearIcon />
                    </span>
                  )}
                </button>
                {openSort === 'source' && (
                  <div className={styles.sortMenu}>
                    {sourceOptions.map(option => (
                      <button
                        key={option}
                        type="button"
                        className={styles.sortOption}
                        onClick={() => {
                          setSortBySource(option);
                          setOpenSort(null);
                        }}
                      >
                        <span
                          className={
                            option === sortBySource
                              ? `${styles.sortRadio} ${styles.sortRadioActive}`
                              : styles.sortRadio
                          }
                        >
                          <span className={styles.sortRadioDot} />
                        </span>
                        <span className={styles.sortOptionText}>{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            text="Создать черновик"
            showArrow={false}
            active
            className={styles.createButton}
            onClick={() => { window.location.href = 'create-post'; }}
          />
        </div>

        <div className={styles.list}>
          {drafts.map(draft => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onPreview={() => setPreviewDraft(draft)}
              onShare={() => handleShare(draft)}
              onDelete={() => setDeleteConfirmId(draft.id)}
              onEdit={() => handleEdit(draft)}
            />
          ))}
          {(!showPageLoader && (isLoading || isLoadingMore)) && (
            <div className={styles.loaderWrapper}>
              <Loader size={24} color="blue" />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Удаление черновика"
        confirmVariant="outlined-red"
      />

      <div className={styles.bottomGradient} />

      {previewData && (
        <PostPreviewModal
          isOpen={!!previewDraft}
          onClose={() => setPreviewDraft(null)}
          channelTitle={previewData.channelTitle}
          channelExtraCount={previewData.channelExtraCount}
          channelPhotoUrl={previewData.channelPhotoUrl}
          channelMembersCount={previewData.channelMembersCount}
          html={previewData.html}
          mediaFiles={previewData.mediaFiles}
          quizData={previewData.quizData}
          inlineKeyboard={previewData.inlineKeyboard}
          token={token}
        />
      )}
    </div>
  );
}

export default function DraftsPage() {
  return (
    <DraftsProvider>
      <DraftsPageContent />
    </DraftsProvider>
  );
}
