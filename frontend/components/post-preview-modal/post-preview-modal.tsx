'use client';

import { useEffect, useState } from 'react';

import styles from './post-preview-modal.module.scss';
import type { MediaFile } from '@/components/media-preview';
import { CloseIcon } from '@/components/icons';

import { MediaPreview } from './media-preview';
import { DocumentsPreview } from './documents-preview';
import { QuizPreview } from './quiz-preview';
import { BlockquotePreview } from './blockquote-preview';
import { CodePreview } from './code-preview';
import InlineKeyboardPreview, { type InlineKeyboardPreviewData } from './inline-keyboard-preview/inline-keyboard-preview';
import {
  type QuizPreviewData,
  normalizeMaybeUrl,
  formatMembersCount,
  createMediaRuns,
  extractBlockquotes,
  createObjectUrls,
  revokeObjectUrls,
} from './store';

export interface PostPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelTitle?: string;
  channelSubtitle?: string;
  channelPhotoUrl?: string;
  channelMembersCount?: number;
  html: string;
  mediaFiles: MediaFile[];
  quizData?: QuizPreviewData;
  inlineKeyboard?: InlineKeyboardPreviewData;
}

export default function PostPreviewModal(props: PostPreviewModalProps) {
  const {
    isOpen,
    onClose,
    channelTitle,
    channelSubtitle,
    channelPhotoUrl,
    channelMembersCount,
    html,
    mediaFiles,
    quizData,
    inlineKeyboard,
  } = props;

  const [avatarBroken, setAvatarBroken] = useState(false);

  const avatarSrc = avatarBroken ? '' : normalizeMaybeUrl(channelPhotoUrl);
  const channelMembersLabel = formatMembersCount(channelMembersCount);
  
  const objectUrls = createObjectUrls(mediaFiles);
  const firstIsDocument = mediaFiles[0]?.type === 'document';
  const headMedia = firstIsDocument ? mediaFiles.slice(0, 1) : mediaFiles;
  const tailMedia = firstIsDocument ? mediaFiles.slice(1) : [];
  const headRuns = createMediaRuns(headMedia, objectUrls);
  const tailRuns = createMediaRuns(tailMedia, objectUrls);

  const { parts } = extractBlockquotes(html);
  const hasContent = headRuns.length > 0 || parts.length > 0 || tailRuns.length > 0;

  useEffect(() => {
    return () => revokeObjectUrls(objectUrls);
  }, [objectUrls]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Предпросмотр публикации</div>
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <CloseIcon width={24} height={24} color="#1E1E1E" />
          </button>
        </div>

        <div className={styles.previewFrame}>
          <div className={styles.chat}>
            <div className={styles.chatHeader}>
              <div className={styles.avatar}>
                {avatarSrc && (
                  <img
                    className={styles.avatarImg}
                    src={avatarSrc}
                    alt=""
                    onError={() => setAvatarBroken(true)}
                  />
                )}
              </div>
              <div className={styles.channelMeta}>
                <div className={styles.channelTitle}>
                  {channelTitle || 'Название канала'}
                </div>
                <div className={styles.channelSub}>
                  {channelSubtitle || channelMembersLabel}
                </div>
              </div>
            </div>

            <div className={styles.messageArea}>
              {hasContent && (
                <div className={styles.bubble}>
                  {headRuns.map((run, idx) =>
                    run.kind === 'visual' ? (
                      <MediaPreview key={`head-visual-${idx}`} items={run.items} />
                    ) : (
                      <DocumentsPreview key={`head-doc-${idx}`} items={run.items} showTitle={false} />
                    )
                  )}
                  {parts.map((part, index) => {
                    if (part.type === 'text') {
                      return (
                        <div key={index} className={styles.textBlock}>
                          <div
                            className={styles.html}
                            dangerouslySetInnerHTML={{ __html: part.content }}
                          />
                        </div>
                      );
                    }
                    if (part.type === 'blockquote') {
                      return (
                        <div key={index} className={styles.blockquoteContainer}>
                          <BlockquotePreview html={part.content} />
                        </div>
                      );
                    }
                    if (part.type === 'code') {
                      return (
                        <div key={index} className={styles.blockquoteContainer}>
                          <CodePreview language={part.language} code={part.content} />
                        </div>
                      );
                    }
                    return null;
                  })}

                  {tailRuns.map((run, idx) =>
                    run.kind === 'visual' ? (
                      <MediaPreview key={`tail-visual-${idx}`} items={run.items} />
                    ) : (
                      <DocumentsPreview key={`tail-doc-${idx}`} items={run.items} showTitle={false} />
                    )
                  )}
                </div>
              )}

              {inlineKeyboard && inlineKeyboard.buttons?.length ? (
                <InlineKeyboardPreview keyboard={inlineKeyboard} />
              ) : null}

              {quizData && <QuizPreview data={quizData} />}
            </div>

            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
