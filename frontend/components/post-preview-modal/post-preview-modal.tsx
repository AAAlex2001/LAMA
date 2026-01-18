'use client';

import { useEffect, useState } from 'react';

import styles from './post-preview-modal.module.scss';
import type { MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';
import { CloseIcon } from '@/components/icons';

import { MediaPreview } from './media-preview';
import { DocumentsPreview } from './documents-preview';
import { QuizPreview } from './quiz-preview';
import { BlockquotePreview } from './blockquote-preview';
import { CodePreview } from './code-preview';
import {
  type QuizPreviewData,
  type HtmlPart,
  normalizeMaybeUrl,
  formatMembersCount,
  extractDocuments,
  extractVisualMedia,
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
  } = props;

  const [avatarBroken, setAvatarBroken] = useState(false);

  const avatarSrc = avatarBroken ? '' : normalizeMaybeUrl(channelPhotoUrl);
  const channelMembersLabel = formatMembersCount(channelMembersCount);
  
  const objectUrls = createObjectUrls(mediaFiles);
  const visualMediaItems = extractVisualMedia(mediaFiles, objectUrls);
  const documentItems = extractDocuments(mediaFiles);
  
  // Извлекаем blockquote из HTML с сохранением порядка
  const { parts } = extractBlockquotes(html);
  const hasContent = visualMediaItems.length > 0 || parts.length > 0;

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => revokeObjectUrls(objectUrls);
  }, [objectUrls]);

  // Escape key handler
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
            {/* Channel Header */}
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

            {/* Message Area */}
            <div className={styles.messageArea}>
              {/* Main bubble with media and text */}
              {(visualMediaItems.length > 0 || hasContent) && (
                <div className={styles.bubble}>
                  <MediaPreview items={visualMediaItems} />
                  {/* Рендерим части в правильном порядке */}
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
                </div>
              )}

              {/* Quiz/Poll */}
              {quizData && <QuizPreview data={quizData} />}

              {/* Documents */}
              <DocumentsPreview items={documentItems} />
            </div>

            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
