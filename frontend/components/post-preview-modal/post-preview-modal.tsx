'use client';

import { useEffect, useMemo, useState } from 'react';

import styles from './post-preview-modal.module.scss';
import type { MediaFile } from '@/components/rich-text-editor/media-preview/media-preview';
import { CloseIcon } from '@/components/icons';
import PlayIcon from '@/components/icons/play-icon';
import DocumentIcon from '@/components/icons/document-icon';

export interface PostPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelTitle?: string;
  channelSubtitle?: string;
  channelPhotoUrl?: string;
  channelMembersCount?: number;
  html: string;
  mediaFiles: MediaFile[];
}

function getPreviewUrl(file: MediaFile): string {
  return file.thumbnail_url || file.preview_url || file.url || '';
}

function normalizeMaybeUrl(value?: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('blob:') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }
  if (raw.startsWith('/')) return raw;

  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  if (base) return `${base}/${raw.replace(/^\//, '')}`;
  return `/${raw.replace(/^\//, '')}`;
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
  } = props;

  const [avatarBroken, setAvatarBroken] = useState(false);
  const avatarSrc = useMemo(
    () => (avatarBroken ? '' : normalizeMaybeUrl(channelPhotoUrl)),
    [avatarBroken, channelPhotoUrl],
  );

  const channelMembersLabel = useMemo(() => {
    if (typeof channelMembersCount !== 'number' || channelMembersCount <= 0) return '';

    const nf = new Intl.NumberFormat('ru-RU');
    const pr = new Intl.PluralRules('ru-RU');
    const rule = pr.select(channelMembersCount);
    const noun = rule === 'one' ? 'подписчик' : rule === 'few' ? 'подписчика' : 'подписчиков';
    return `${nf.format(channelMembersCount)} ${noun}`;
  }, [channelMembersCount]);

  const visualMedia = useMemo(
    () => mediaFiles.filter((m) => m.type === 'image' || m.type === 'video'),
    [mediaFiles],
  );

  const documents = useMemo(
    () => mediaFiles.filter((m) => m.type === 'document'),
    [mediaFiles],
  );

  const objectUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of mediaFiles) {
      if (m.file) {
        map.set(m.id, URL.createObjectURL(m.file));
      }
    }
    return map;
  }, [mediaFiles]);

  useEffect(() => {
    return () => {
      for (const url of objectUrls.values()) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      }
    };
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

  const getUrl = (m: MediaFile): string => {
    return objectUrls.get(m.id) || getPreviewUrl(m);
  };

  const renderMedia = () => {
    if (visualMedia.length === 0) return null;

    const renderTile = (m: MediaFile, url: string, className?: string, size: 'big' | 'small' = 'small') => {
      const tile = m.type === 'video' && !m.thumbnail_url ? (
        <video
          className={styles.mediaVideo}
          src={url}
          muted
          playsInline
          preload="metadata"
          style={{ filter: m.blur ? 'blur(20px)' : 'none' }}
        />
      ) : (
        <img
          src={url}
          alt=""
          className={styles.mediaImg}
          style={{ filter: m.blur ? 'blur(20px)' : 'none' }}
        />
      );

      return (
        <div
          className={`${styles.mediaTile} ${m.type === 'video' ? styles.mediaTileVideo : ''} ${className || ''}`}
        >
          {tile}
          {m.type === 'video' && (
            <div className={`${styles.playOverlay} ${size === 'big' ? styles.playOverlayBig : styles.playOverlaySmall}`}>
              <div className={styles.playBadge}>
                <PlayIcon width={size === 'big' ? 28 : 22} height={size === 'big' ? 28 : 22} color="#1E1E1E" />
              </div>
            </div>
          )}
        </div>
      );
    };

    if (visualMedia.length === 1) {
      const url = getUrl(visualMedia[0]);
      if (!url) return null;
      return <div className={styles.mediaSingle}>{renderTile(visualMedia[0], url, styles.mediaSingleItem, 'big')}</div>;
    }

    if (visualMedia.length === 2) {
      const url1 = getUrl(visualMedia[0]);
      const url2 = getUrl(visualMedia[1]);
      if (!url1 || !url2) return null;
      return (
        <div className={styles.mediaDual}>
          {renderTile(visualMedia[0], url1, styles.mediaDualItem, 'small')}
          {renderTile(visualMedia[1], url2, styles.mediaDualItem, 'small')}
        </div>
      );
    }

    const main = visualMedia[0];
    const mainUrl = getUrl(main);
    if (!mainUrl) return null;

    const thumbs = visualMedia.slice(1);

    return (
      <div className={styles.mediaBlock}>
        <div className={styles.mediaMain}>
          {renderTile(main, mainUrl, undefined, 'big')}
        </div>

        {thumbs.length > 0 && (
          <div className={styles.mediaGrid}>
            {thumbs.map((m) => {
              const url = getUrl(m);
              if (!url) return <div key={m.id} className={styles.gridTile} />;
              return (
                <div key={m.id} className={styles.gridTile}>
                  {renderTile(m, url, undefined, 'small')}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const formatBytes = (size?: number): string => {
    if (!size || size <= 0) return '';
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getDocName = (m: MediaFile): string => {
    if (m.file?.name) return m.file.name;
    try {
      const raw = m.url || '';
      const last = raw.split('/').pop() || '';
      return decodeURIComponent(last) || 'Документ';
    } catch {
      return 'Документ';
    }
  };

  const renderDocuments = () => {
    if (documents.length === 0) return null;

    return (
      <div className={styles.docsBlock}>
        <div className={styles.docsTitle}>Прикрепленные файлы ({documents.length})</div>
        <div className={styles.docsList}>
          {documents.map((m) => {
            const name = getDocName(m);
            const size = formatBytes(m.file?.size);
            return (
              <div key={m.id} className={styles.docRow}>
                <div className={styles.docIcon}>
                  <DocumentIcon width={20} height={20} color="#CED2D6" />
                </div>
                <div className={styles.docMeta}>
                  <div className={styles.docName}>{name}</div>
                  {size && <div className={styles.docSize}>{size}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>Предпросмотр публикации</div>
          <button className={styles.closeButton} type="button" aria-label="Закрыть" onClick={onClose}>
            <CloseIcon width={24} height={24} color="#1E1E1E" />
          </button>
        </div>

        <div className={styles.previewFrame}>
          <div className={styles.chat}>
            <div className={styles.chatHeader}>
              <div className={styles.avatar}>
                {avatarSrc ? (
                  <img
                    className={styles.avatarImg}
                    src={avatarSrc}
                    alt=""
                    onError={() => setAvatarBroken(true)}
                  />
                ) : null}
              </div>
              <div className={styles.channelMeta}>
                <div className={styles.channelTitle}>{channelTitle || 'Название канала'}</div>
                <div className={styles.channelSub}>{channelSubtitle || channelMembersLabel}</div>
              </div>
            </div>

            <div className={styles.messageArea}>
              <div className={styles.bubble}>
                {renderMedia()}
                <div className={styles.textBlock}>
                  <div className={styles.html} dangerouslySetInnerHTML={{ __html: html || '' }} />
                </div>
              </div>

              {renderDocuments()}
            </div>

            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
