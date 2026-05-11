'use client';

import { useCallback, useRef, useState } from 'react';

const ACCEPTED_TYPES = [
  'image/',
  'video/',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export function isAcceptedFile(file: File): boolean {
  return ACCEPTED_TYPES.some((t) => file.type.startsWith(t));
}

interface UseDragDropParams {
  enabled: boolean;
  onFiles: (files: File[]) => void;
}

export function useDragDrop({ enabled, onFiles }: UseDragDropParams) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (!enabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files).filter(isAcceptedFile);
    if (droppedFiles.length > 0) {
      onFiles(droppedFiles);
    }
  }, [enabled, onFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!enabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && isAcceptedFile(file)) {
          files.push(file);
        }
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      onFiles(files);
    }
  }, [enabled, onFiles]);

  return {
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
  };
}
