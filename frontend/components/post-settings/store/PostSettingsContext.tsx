'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { usePostSettings, type PostSettingsStore } from './usePostSettings';

interface PostSettingsContextValue extends PostSettingsStore {
  // Toggle visibility
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const PostSettingsContext = createContext<PostSettingsContextValue | null>(null);

interface PostSettingsProviderProps {
  children: ReactNode;
}

export function PostSettingsProvider({ children }: PostSettingsProviderProps) {
  const postSettings = usePostSettings();
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  const value: PostSettingsContextValue = {
    ...postSettings,
    isOpen,
    open,
    close,
    toggle,
  };

  return <PostSettingsContext.Provider value={value}>{children}</PostSettingsContext.Provider>;
}

export function usePostSettingsContext() {
  const context = useContext(PostSettingsContext);
  if (!context) {
    throw new Error('usePostSettingsContext must be used within PostSettingsProvider');
  }
  return context;
}
