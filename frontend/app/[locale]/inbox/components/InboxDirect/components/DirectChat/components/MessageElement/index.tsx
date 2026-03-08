'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './styles.module.scss';
import EditIcon from '@/components/icons/edit-icon';
import TrashIcon from '@/components/icons/trash-icon';
import UserIcon from '@/components/icons/user-icon';
import DeleteConfirmationModal from '@/components/modal';
import { createObjectUrls, revokeObjectUrls, createMediaRuns } from '@/components/post-preview-modal/store';
import MediaPreview from '@/components/post-preview-modal/media-preview/media-preview';
import type { MediaFile } from '@/components/media-preview';
import DocumentsPreview from '@/components/post-preview-modal/documents-preview/documents-preview';
import { DesktopWrapper } from '@/components/responsive-wrappers';

export interface MediaItem {
  type: 'video' | 'file' | 'image';
  src?: string;
  file?: File;
  id?: string;
}

export interface MessageProps {
  type: 'incoming' | 'outgoing' | 'system';
  text?: string;
  mediaItems?: MediaItem[];
  time?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const MessageElement = ({ type, text, mediaItems, time, onEdit, onDelete }: MessageProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [objectUrls, setObjectUrls] = useState<Map<string, string>>(new Map());
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false);
    onDelete?.();
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
  };

  const mediaFiles: MediaFile[] = (mediaItems || [])
    .map((item, i): MediaFile => ({
      id: item.id || `item-${i}`,
      type: (item.type === 'image' ? 'image' : item.type === 'video' ? 'video' : 'document') as 'image' | 'video' | 'document',
      file: item.file,
      url: item.src,
    }));

  const filesNeedingUrls = mediaFiles.filter((m) => m.file && (m.type === 'image' || m.type === 'video' || m.type === 'document'));

  useEffect(() => {
    if (filesNeedingUrls.length === 0) {
      if (objectUrlsRef.current.size > 0) {
        revokeObjectUrls(objectUrlsRef.current);
        objectUrlsRef.current = new Map();
        setObjectUrls(new Map());
      }
      return;
    }

    createObjectUrls(filesNeedingUrls).then((urls) => {
      if (objectUrlsRef.current.size > 0) {
        revokeObjectUrls(objectUrlsRef.current);
      }
      objectUrlsRef.current = urls;
      setObjectUrls(urls);
    });

    return () => {
      if (objectUrlsRef.current.size > 0) {
        revokeObjectUrls(objectUrlsRef.current);
        objectUrlsRef.current = new Map();
      }
    };
  }, [mediaItems]);

  const mediaRuns = createMediaRuns(mediaFiles, objectUrls);

  const isOutgoing = type === 'outgoing';

  if (type === 'system') {
    return (
      <div className={styles.systemMessage}>
        <span className={styles.systemMessageText}>{text}</span>
      </div>
    );
  }

  if (mediaRuns.length > 0 && !text && type) {
    return (
      <div className={isOutgoing ? styles.outgoingWrapper : styles.incomingWrapper}>
        <DesktopWrapper>
          { 
          !isOutgoing && <div className={styles.avatarWrapper}>
              <div className={styles.avatar}>
                <UserIcon width={22} height={22} color="#B0B4B8" />
              </div>
            </div>
          }
        </DesktopWrapper>
        <div className={styles.mediaContainer}>
          {mediaRuns.map((run, idx) =>
            run.kind === 'visual' ? (
              <MediaPreview key={`visual-${idx}`} items={run.items} />
            ) : (
              <DocumentsPreview key={`head-doc-${idx}`} items={run.items} showTitle={false} />
            )
          )}
          {time && <span className={styles.mediaTime}>{time}</span>}
        </div>
      </div>
    );

  }

  if (type === 'incoming') {
    return (
      <div className={styles.incomingWrapper}>
        <DesktopWrapper>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatar}>
              <UserIcon width={22} height={22} color="#B0B4B8" />
            </div>
          </div>
        </DesktopWrapper>
        <div className={styles.incomingBubble}>
          <div className={styles.mediaContainer}>
            {mediaRuns.map((run, idx) =>
              run.kind === 'visual' ? (
                <MediaPreview key={`visual-${idx}`} items={run.items} />
              ) : (
                <DocumentsPreview key={`head-doc-${idx}`} items={run.items} showTitle={false} />
              )
            )}
          </div>
          {text && <p className={styles.messageText}>{text}</p>}
          {time && <span className={styles.incomingTime}>{time}</span>}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.outgoingWrapper}>
        <div className={styles.outgoingBubble}>
          <div className={styles.mediaContainer}>
            {mediaRuns.map((run, idx) =>
              run.kind === 'visual' ? (
                <MediaPreview key={`visual-${idx}`} items={run.items} />
              ) : (
                <DocumentsPreview key={`head-doc-${idx}`} items={run.items} showTitle={false} />
              )
            )}
          </div>
          {text && <p className={styles.messageText}>{text}</p>}
          <div className={styles.outgoingMeta}>
            <div className={styles.msgActions}>
              <button className={styles.msgAction} onClick={onEdit}>
                <EditIcon width={20} height={20} color="#F1F5FB" />
              </button>
              <button className={styles.msgAction} onClick={handleDeleteClick}>
                <TrashIcon width={20} height={20} color="#F1F5FB" />
              </button>
            </div>
            {time && <span className={styles.outgoingTime}>{time}</span>}
          </div>
        </div>
      </div>
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Удаление сообщения"
        description="Сообщение удалится у обоих участников"
        confirmVariant="outlined-red"
      />
    </>
  );
};

export default MessageElement;
