'use client';

import { useRef } from 'react';
import OldButton from '@/components/button/button';
import MediaPreview from '@/components/media-preview/media-preview';
import { PaperclipIcon } from '@/components/icons';
import { useAppDispatch, useAppSelector } from '../store';
import * as mediaSlice from '../store/slices/media';
import type { MediaFile as MediaPreviewFile } from '@/components/media-preview/media-preview';

interface MediaSectionConnectedProps {
  className?: string;
  titleClassName?: string;
  mobilClassName?: string;
  dropzoneClassName?: string;
  dropzoneTextClassName?: string;
  dropzoneContentClassName?: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMoveMedia: (fromId: string, toId: string) => void;
}

export default function MediaSectionConnected({
  className,
  titleClassName,
  mobilClassName,
  dropzoneClassName,
  dropzoneTextClassName,
  dropzoneContentClassName,
  onFileUpload,
  onMoveMedia,
}: MediaSectionConnectedProps) {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mediaFiles = useAppSelector(state => state.media.files);
  const buttonRows = useAppSelector(state => state.inlineButtons.rows);
  const canAddMedia = buttonRows.length > 0 ? mediaFiles.length < 1 : mediaFiles.length < 10;

  return (
    <div className={className}>
      <span className={titleClassName}>Медиа и файлы</span>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        onChange={onFileUpload}
        style={{ display: 'none' }}
      />
      <div className={mobilClassName}>
        <MediaPreview
          files={mediaFiles as MediaPreviewFile[]}
          onRemove={(id) => dispatch(mediaSlice.removeFile(id))}
          onToggleBlur={(id) => dispatch(mediaSlice.toggleBlur(id))}
          onMove={onMoveMedia}
        />
        <OldButton
          text="Прикрепить файл"
          variant="templateCardInternal"
          showArrow={false}
          icon={<PaperclipIcon width={24} height={24} />}
          fullWidth
          disabled={!canAddMedia}
          onClick={() => fileInputRef.current?.click()}
        />
      </div>
      <div className={dropzoneClassName}>
        {mediaFiles.length === 0 ? (
          <>
            <span className={dropzoneTextClassName}>
              Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
            </span>
            <OldButton
              text="Прикрепить файл"
              variant="templateCardInternal"
              showArrow={false}
              icon={<PaperclipIcon width={24} height={24} />}
              disabled={!canAddMedia}
              onClick={() => fileInputRef.current?.click()}
            />
          </>
        ) : (
          <div className={dropzoneContentClassName}>
            <MediaPreview
              files={mediaFiles as MediaPreviewFile[]}
              onRemove={(id) => dispatch(mediaSlice.removeFile(id))}
              onToggleBlur={(id) => dispatch(mediaSlice.toggleBlur(id))}
              onMove={onMoveMedia}
            />
            <OldButton
              text="Прикрепить файл"
              variant="templateCardInternal"
              showArrow={false}
              icon={<PaperclipIcon width={24} height={24} />}
              disabled={!canAddMedia}
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
