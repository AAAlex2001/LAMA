'use client';

import React, { createContext, useContext, useReducer, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { RichTextEditorState, RichTextEditorHoveredButton } from './store/types';
import { richTextEditorReducer, initialRichTextEditorState } from './store/state';

interface RichTextEditorContextValue {
  // State
  text: string;
  uiState: RichTextEditorState;
  
  // Refs
  editorRef: RefObject<{ reset: () => void } | null>;
  
  // Actions
  setText: (text: string) => void;
  setHoveredButton: (button: RichTextEditorHoveredButton) => void;
  setShowAiInput: (show: boolean) => void;
  setShowEmojiPicker: (show: boolean) => void;
  setShowLinkInput: (show: boolean) => void;
  setLinkUrl: (url: string) => void;
  reset: () => void;
}

const RichTextEditorContext = createContext<RichTextEditorContextValue | null>(null);

interface RichTextEditorProviderProps {
  children: ReactNode;
  initialText?: string;
}

export function RichTextEditorProvider({ children, initialText = '' }: RichTextEditorProviderProps) {
  const [text, setText] = useState(initialText);
  const [uiState, dispatch] = useReducer(richTextEditorReducer, initialRichTextEditorState);
  const editorRef = useRef<{ reset: () => void } | null>(null);

  const setHoveredButton = (button: RichTextEditorHoveredButton) => {
    dispatch({ type: 'SET_HOVERED_BUTTON', payload: button });
  };

  const setShowAiInput = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_AI_INPUT', payload: show });
  };

  const setShowEmojiPicker = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_EMOJI_PICKER', payload: show });
  };

  const setShowLinkInput = (show: boolean) => {
    dispatch({ type: 'SET_SHOW_LINK_INPUT', payload: show });
  };

  const setLinkUrl = (url: string) => {
    dispatch({ type: 'SET_LINK_URL', payload: url });
  };

  const reset = () => {
    setText('');
    editorRef.current?.reset();
  };

  const value: RichTextEditorContextValue = {
    text,
    uiState,
    editorRef,
    setText,
    setHoveredButton,
    setShowAiInput,
    setShowEmojiPicker,
    setShowLinkInput,
    setLinkUrl,
    reset,
  };

  return <RichTextEditorContext.Provider value={value}>{children}</RichTextEditorContext.Provider>;
}

export function useRichTextEditor() {
  const context = useContext(RichTextEditorContext);
  if (!context) {
    throw new Error('useRichTextEditor must be used within RichTextEditorProvider');
  }
  return context;
}
