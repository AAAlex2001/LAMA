'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface MediaFile {
  id: string;
  url: string; 
  preview_url?: string;
  thumbnail_url?: string | null;
  type: 'image' | 'video' | 'document';
  blur?: boolean;
  file?: File;
  telegram_file_id?: string | null;
}

interface MediaPreviewContextValue {
  // State
  files: MediaFile[];
  
  // Actions
  addFiles: (files: MediaFile[]) => void;
  removeFile: (id: string) => void;
  moveFile: (sourceId: string, targetId: string) => void;
  toggleBlur: (id: string) => void;
  setPreviewUrl: (id: string, previewUrl: string) => void;
  setThumbnailUrl: (id: string, thumbnailUrl: string | null) => void;
  clearFiles: () => void;
  setFiles: (files: MediaFile[]) => void;
  
  // Computed
  canAddMedia: boolean;
}

const MediaPreviewContext = createContext<MediaPreviewContextValue | null>(null);

interface MediaPreviewProviderProps {
  children: ReactNode;
  maxFiles?: number;
}

export function MediaPreviewProvider({ children, maxFiles = 10 }: MediaPreviewProviderProps) {
  const [files, setFilesState] = useState<MediaFile[]>([]);

  const addFiles = (newFiles: MediaFile[]) => {
    setFilesState(prev => {
      const remaining = maxFiles - prev.length;
      const toAdd = newFiles.slice(0, remaining);
      return [...prev, ...toAdd];
    });
  };

  const removeFile = (id: string) => {
    setFilesState(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview_url?.startsWith('blob:')) {
        URL.revokeObjectURL(file.preview_url);
      }
      if (file?.url.startsWith('blob:')) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const moveFile = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setFilesState(prev => {
      const sourceIndex = prev.findIndex(f => f.id === sourceId);
      const targetIndex = prev.findIndex(f => f.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const toggleBlur = (id: string) => {
    setFilesState(prev => prev.map(f => 
      f.id === id ? { ...f, blur: !f.blur } : f
    ));
  };

  const setPreviewUrl = (id: string, previewUrl: string) => {
    setFilesState(prev => prev.map(f => {
      if (f.id !== id) return f;
      if (f.preview_url?.startsWith('blob:')) {
        URL.revokeObjectURL(f.preview_url);
      }
      return { ...f, preview_url: previewUrl };
    }));
  };

  const setThumbnailUrl = (id: string, thumbnailUrl: string | null) => {
    setFilesState(prev => prev.map(f => 
      f.id === id ? { ...f, thumbnail_url: thumbnailUrl } : f
    ));
  };

  const clearFiles = () => {
    files.forEach(f => {
      if (f.preview_url?.startsWith('blob:')) URL.revokeObjectURL(f.preview_url);
      if (f.url.startsWith('blob:')) URL.revokeObjectURL(f.url);
    });
    setFilesState([]);
  };

  const setFiles = (newFiles: MediaFile[]) => {
    setFilesState(newFiles);
  };

  const canAddMedia = files.length < maxFiles;

  const value: MediaPreviewContextValue = {
    files,
    addFiles,
    removeFile,
    moveFile,
    toggleBlur,
    setPreviewUrl,
    setThumbnailUrl,
    clearFiles,
    setFiles,
    canAddMedia,
  };

  return <MediaPreviewContext.Provider value={value}>{children}</MediaPreviewContext.Provider>;
}

export function useMediaPreview() {
  const context = useContext(MediaPreviewContext);
  if (!context) {
    throw new Error('useMediaPreview must be used within MediaPreviewProvider');
  }
  return context;
}
