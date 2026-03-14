'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import styles from './styles.module.scss';
import EditIcon from '@/components/icons/edit-icon';
import TrashIcon from '@/components/icons/trash-icon';
import UserIcon from '@/components/icons/user-icon';
import { ReplyIcon } from '@/components/icons';
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
  name?: string;
  size?: number;
}

export interface ReplyToInfo {
  text: string;
  onClick: () => void;
}

export interface MessageProps {
  type: 'incoming' | 'outgoing' | 'system';
  text?: string;
  messageId?: number;
  userPhoto?: string;
  mediaItems?: MediaItem[];
  time?: string;
  replyTo?: ReplyToInfo;
  onEdit?: () => void;
  onReply?: () => void;
  onDelete?: () => void;
}

const ReplyPreview = memo(({ replyTo, isOutgoing }: { replyTo: ReplyToInfo; isOutgoing: boolean }) => (
  <button
    type="button"
    className={isOutgoing ? styles.replyPreviewOutgoing : styles.replyPreview}
    onClick={replyTo.onClick}
  >
    <span className={styles.replyPreviewLine} />
    <span className={styles.replyPreviewText}>{replyTo.text}</span>
  </button>
));
ReplyPreview.displayName = 'ReplyPreview';

const MessageElement = memo(({ type, text, messageId, userPhoto, mediaItems, time, replyTo, onEdit, onReply, onDelete }: MessageProps) => {
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

  // const mediaItemsKey = (mediaItems || []).map((item) => `${item.id ?? ''}|${item.type}|${item.src ?? ''}`).join(',');
  const mediaFiles: MediaFile[] = (mediaItems || []).map((item, i): MediaFile => ({
    id: item.id || `item-${i}`,
    type: (item.type === 'image' ? 'image' : item.type === 'video' ? 'video' : 'document') as 'image' | 'video' | 'document',
    file: item.file,
    url: item.src,
    name: item.name,
    size: item.size,
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

    let cancelled = false;
    createObjectUrls(filesNeedingUrls).then((urls) => {
      if (cancelled) {
        revokeObjectUrls(urls);
        return;
      }
      if (objectUrlsRef.current.size > 0) {
        revokeObjectUrls(objectUrlsRef.current);
      }
      objectUrlsRef.current = urls;
      setObjectUrls(urls);
    });

    return () => {
      cancelled = true;
      if (objectUrlsRef.current.size > 0) {
        revokeObjectUrls(objectUrlsRef.current);
        objectUrlsRef.current = new Map();
      }
    };
  }, [filesNeedingUrls]);

  const mediaRuns = createMediaRuns(mediaFiles, objectUrls);
  const isOutgoing = type === 'outgoing';

  if (type === 'system') {
    if ((mediaRuns.length > 0 || text) && messageId !== 0) {
      return (
        <div className={styles.postCard}>
          {mediaRuns.length > 0 && (
            <div className={styles.postCardMedia}>
              {mediaRuns.map((run, idx) =>
                run.kind === 'visual' ? (
                  <MediaPreview key={`visual-${idx}`} items={run.items} />
                ) : (
                  <DocumentsPreview key={`head-doc-${idx}`} items={run.items} showTitle={false} />
                )
              )}
            </div>
          )}
          {text && <p className={styles.postCardText}>{text}</p>}
          {time && <span className={styles.postCardTime}>{time}</span>}
        </div>
      );
    }
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
          !isOutgoing  && 
            <div className={styles.avatarWrapper}>
              <div className={styles.avatar}>
                {userPhoto ? <img src={userPhoto} alt="User photo" className={styles.avatar} /> : <UserIcon width={22} height={22} color="#B0B4B8" />}
              </div>
            </div>
          }
        </DesktopWrapper>
        {isOutgoing && onReply && (
          <div className={styles.outgoingMeta}>
            <button className={styles.outgoingReplyAction} onClick={onReply} type="button">
              <ReplyIcon width={20} height={20} />
            </button>
          </div>
        )}
        <div className={styles.mediaContainer}>
          {replyTo && <ReplyPreview replyTo={replyTo} isOutgoing={isOutgoing} />}
          {mediaRuns.map((run, idx) =>
            run.kind === 'visual' ? (
              <MediaPreview key={`visual-${idx}`} items={run.items} />
            ) : (
              <DocumentsPreview key={`head-doc-${idx}`} items={run.items} showTitle={false} />
            )
          )}
          {time && <span className={styles.mediaTime}>{time}</span>}
        </div>
        {!isOutgoing && onReply && (
          <div className={styles.incomingMeta}>
            <button className={styles.incomingReplyAction} onClick={onReply} type="button">
              <ReplyIcon width={20} height={20} />
            </button>
          </div>
        )}
      </div>
    );

  }

  if (type === 'incoming') {
    return (
      <div className={styles.incomingWrapper}>
        <DesktopWrapper>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatar}>
              {userPhoto ? <img src={userPhoto} alt="User" className={styles.avatar} /> : <UserIcon width={22} height={22} color="#B0B4B8" />}
            </div>
          </div>
        </DesktopWrapper>
        <div className={styles.incomingBubble}>
          {replyTo && <ReplyPreview replyTo={replyTo} isOutgoing={false} />}
          { (mediaRuns.length > 0) && (
            <div className={styles.messageMediaWrapper}>
              {mediaRuns.map((run, idx) =>
                run.kind === 'visual' ? (
                  <MediaPreview key={`visual-${idx}`} items={run.items} />
                ) : (
                  <DocumentsPreview key={`head-doc-${idx}`} items={run.items} showTitle={false} />
                )
              )}
            </div>
          )}
          {text && <p className={styles.messageText}>{text}</p>}
          <div className={styles.incomingMeta}>
            {onReply && (
              <button className={styles.incomingReplyAction} onClick={onReply} type="button">
                <ReplyIcon width={20} height={20} />
              </button>
            )}
            {time && <span className={styles.incomingTime}>{time}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.outgoingWrapper}>
        <div className={styles.outgoingBubble}>
          {replyTo && <ReplyPreview replyTo={replyTo} isOutgoing={true} />}
          { (mediaRuns.length > 0 ) && (
            <div className={styles.messageMediaWrapper}>
              {mediaRuns.map((run, idx) =>
                run.kind === 'visual' ? (
                  <MediaPreview key={`visual-${idx}`} items={run.items} />
                ) : (
                  <DocumentsPreview key={`head-doc-${idx}`} items={run.items} showTitle={false} />
                )
              )}
            </div>
          )}
          {text && <p className={styles.messageText}>{text}</p>}
          <div className={styles.outgoingMeta}>
            {(onReply || onEdit || onDelete) && (
              <div className={styles.msgActions}>
                {onReply && (
                  <button className={styles.msgAction} onClick={onReply}>
                    <ReplyIcon width={20} height={20} color="#F1F5FB" />
                  </button>
                )}
                {onEdit && (
                  <button className={styles.msgAction} onClick={onEdit}>
                    <EditIcon width={20} height={20} color="#F1F5FB" />
                  </button>
                )}
                {onDelete && (
                  <button className={styles.msgAction} onClick={handleDeleteClick}>
                    <TrashIcon width={20} height={20} color="#F1F5FB" />
                  </button>
                )}
              </div>
            )}
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
});
MessageElement.displayName = 'MessageElement';

export default MessageElement;
