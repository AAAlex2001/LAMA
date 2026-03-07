'use client';

import { useState, useRef, useCallback } from 'react';
import type { MediaFile } from '@/components/media-preview';
import { compressImageForPreview, createVideoThumbnail } from '@/components/media-preview/utils';

const MAX_MEDIA_FILES = 10;

export function useMessageMedia() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canAddMedia = mediaFiles.length < MAX_MEDIA_FILES;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_MEDIA_FILES - mediaFiles.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    const filePromises = filesToProcess.map(async (file) => {
      const type: 'video' | 'image' | 'document' = file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('image/') ? 'image' : 'document';
      
      let preview_url: string | undefined;
      let thumbnail_url: string | undefined;
      
      if (type === 'image') {
        preview_url = await compressImageForPreview(file);
      } else if (type === 'video') {
        thumbnail_url = await createVideoThumbnail(file);
      }
      
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        file,
        preview_url,
        thumbnail_url,
        size: file.size,
        blur: false,
      } as MediaFile;
    });
    
    const newFiles = await Promise.all(filePromises);
    setMediaFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setMediaFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearMedia = useCallback(() => {
    setMediaFiles([]);
  }, []);

  const handleToggleBlur = (id: string) => {
    setMediaFiles(prev => prev.map(f => 
      f.id === id ? { ...f, blur: !f.blur } : f
    ));
  };

  const handleMoveMedia = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setMediaFiles(prev => {
      const files = [...prev];
      const sourceIndex = files.findIndex(f => f.id === fromId);
      const targetIndex = files.findIndex(f => f.id === toId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const [moved] = files.splice(sourceIndex, 1);
      files.splice(targetIndex, 0, moved);
      return files;
    });
  };

  return {
    mediaFiles,
    fileInputRef,
    canAddMedia,
    handleFileUpload,
    handleRemoveFile,
    handleToggleBlur,
    handleMoveMedia,
    handleClearMedia,
  };
}
