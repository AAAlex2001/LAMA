'use client';

import { createContext, useContext, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { TemplatePageContent } from '../types';

type TemplateContextValue = {
  content: TemplatePageContent;
  setContent: Dispatch<SetStateAction<TemplatePageContent>>;
  setMessage: (msg: string) => void;
  uploadImage: (file: File) => Promise<string | null>;
};

const TemplateContext = createContext<TemplateContextValue | null>(null);

export function TemplateProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: TemplateContextValue;
}) {
  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>;
}

export function useTemplateContext() {
  const ctx = useContext(TemplateContext);
  if (!ctx) {
    throw new Error('useTemplateContext must be used within TemplateProvider');
  }
  return ctx;
}
