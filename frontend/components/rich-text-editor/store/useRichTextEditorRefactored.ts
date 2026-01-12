'use client';

import { useRef, useCallback, useReducer, useEffect } from 'react';
import type { FormatType, RichTextEditorState, RichTextEditorAction, RichTextEditorData } from './types';
import { initialState } from './types';
import { toggleBasicFormat } from './formatters/basicFormatter';
import { applySpoilerFormat } from './formatters/spoilerFormatter';
import { applyCodeFormat } from './formatters/codeFormatter';
import { isFormatActive, isSpoilerActive, isCodeActive } from './utils/formatDetection';

const MAX_CHARS = 4096;

function richTextEditorReducer(
  state: RichTextEditorState,
  action: RichTextEditorAction
): RichTextEditorState {
  switch (action.type) {
    case 'SET_CONTENT':
      return { ...state, content: action.payload };
    case 'SET_ACTIVE_FORMATS':
      return { ...state, activeFormats: action.payload };
    case 'SET_HOVERED_BUTTON':
      return { ...state, hoveredButton: action.payload };
    case 'SET_IS_EMPTY':
      return { ...state, isEmpty: action.payload };
    case 'SET_CHAR_COUNT':
      return { ...state, charCount: action.payload };
    case 'RESET':
      return { ...initialState, activeFormats: new Set() };
    default:
      return state;
  }
}

export function useRichTextEditor(maxLength: number = MAX_CHARS) {
  const [state, dispatch] = useReducer(richTextEditorReducer, {
    ...initialState,
    activeFormats: new Set<string>(),
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);
  const processingRef = useRef(false);

  const ensureInlineFormatsEnabled = useCallback((formats: Set<string>) => {
    if (formats.has('b') && !document.queryCommandState('bold')) {
      document.execCommand('bold', false);
    }
    if (formats.has('i') && !document.queryCommandState('italic')) {
      document.execCommand('italic', false);
    }
    if (formats.has('u') && !document.queryCommandState('underline')) {
      document.execCommand('underline', false);
    }
    if (formats.has('s') && !document.queryCommandState('strikeThrough')) {
      document.execCommand('strikeThrough', false);
    }
  }, []);

  const updateActiveFormats = useCallback(() => {
    const newFormats = new Set<string>();
    const editor = editorRef.current;

    if (!editor) {
      dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
      return;
    }

    if (isFormatActive('bold')) newFormats.add('b');
    if (isFormatActive('italic')) newFormats.add('i');
    if (isFormatActive('strikeThrough')) newFormats.add('s');
    if (isFormatActive('underline')) newFormats.add('u');

    if (isSpoilerActive(editor)) newFormats.add('tg-spoiler');
    if (isCodeActive(editor)) newFormats.add('code');

    dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
  }, []);

  const normalizeHtml = useCallback((html: string): string => {
    html = html.replace(/\u200B/g, '');

    html = html
      .replace(/<strong>/gi, '<b>')
      .replace(/<\/strong>/gi, '</b>')
      .replace(/<em>/gi, '<i>')
      .replace(/<\/em>/gi, '</i>')
      .replace(/<strike>/gi, '<s>')
      .replace(/<\/strike>/gi, '</s>')
      .replace(/<del>/gi, '<s>')
      .replace(/<\/del>/gi, '</s>');

    html = html.replace(/<(b|i|u|s|strong|em|strike|del)\s+style="[^"]+"/gi, '<$1');
    html = html.replace(/\s+style=""/gi, '');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const spoilerSpans = tempDiv.querySelectorAll('span[data-spoiler="true"]');
    spoilerSpans.forEach((span) => {
      const spoilerTag = document.createElement('tg-spoiler');
      while (span.firstChild) {
        spoilerTag.appendChild(span.firstChild);
      }
      span.parentNode?.replaceChild(spoilerTag, span);
    });

    return tempDiv.innerHTML;
  }, []);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return '';
    if (processingRef.current) {
      return state.content;
    }
    processingRef.current = true;

    try {
      const textContent = editorRef.current.textContent || '';

      if (textContent.length > maxLength) {
        editorRef.current.innerHTML = state.content;
        return state.content;
      }

      const isEmpty = !textContent.trim();
      dispatch({ type: 'SET_IS_EMPTY', payload: isEmpty });
      dispatch({ type: 'SET_CHAR_COUNT', payload: textContent.length });

      if (isEmpty) {
        dispatch({ type: 'SET_ACTIVE_FORMATS', payload: new Set() });
      }

      const html = normalizeHtml(editorRef.current.innerHTML);

      isInternalUpdate.current = true;
      dispatch({ type: 'SET_CONTENT', payload: html });

      return html;
    } finally {
      processingRef.current = false;
    }
  }, [maxLength, state.content, normalizeHtml]);

  const applyFormatting = useCallback(
    (variant: FormatType, spoilerClassName?: string): string | undefined => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();

      if (variant === 'b') {
        toggleBasicFormat('bold');
        const newFormats = new Set(state.activeFormats);
        state.activeFormats.has('b') ? newFormats.delete('b') : newFormats.add('b');
        dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
        return handleInput();
      }

      if (variant === 'i') {
        toggleBasicFormat('italic');
        const newFormats = new Set(state.activeFormats);
        state.activeFormats.has('i') ? newFormats.delete('i') : newFormats.add('i');
        dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
        return handleInput();
      }

      if (variant === 's') {
        toggleBasicFormat('strikeThrough');
        const newFormats = new Set(state.activeFormats);
        state.activeFormats.has('s') ? newFormats.delete('s') : newFormats.add('s');
        dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
        return handleInput();
      }

      if (variant === 'u') {
        toggleBasicFormat('underline');
        const newFormats = new Set(state.activeFormats);
        state.activeFormats.has('u') ? newFormats.delete('u') : newFormats.add('u');
        dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
        return handleInput();
      }

      if (variant === 'tg-spoiler') {
        applySpoilerFormat(
          editor,
          spoilerClassName,
          (hasActive) => {
            const newFormats = new Set(state.activeFormats);
            if (hasActive) {
              newFormats.add('tg-spoiler');
            } else {
              newFormats.delete('tg-spoiler');
              ensureInlineFormatsEnabled(newFormats);
            }
            dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
          }
        );
        updateActiveFormats();
        return handleInput();
      }

      if (variant === 'code') {
        applyCodeFormat(editor);
        updateActiveFormats();
        return handleInput();
      }
    },
    [handleInput, updateActiveFormats, state.activeFormats, ensureInlineFormatsEnabled]
  );

  const syncContent = useCallback((value: string) => {
    if (editorRef.current && !isInternalUpdate.current) {
      const currentHtml = editorRef.current.innerHTML;
      if (value !== currentHtml) {
        editorRef.current.innerHTML = value;
        const textContent = editorRef.current.textContent || '';
        dispatch({ type: 'SET_IS_EMPTY', payload: !textContent.trim() });
        dispatch({ type: 'SET_CHAR_COUNT', payload: textContent.length });
      }
    }
    isInternalUpdate.current = false;
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        applyFormatting('b');
      }
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        applyFormatting('i');
      }
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        applyFormatting('u');
      }
    },
    [applyFormatting]
  );

  const setHoveredButton = useCallback((buttonId: string | null) => {
    dispatch({ type: 'SET_HOVERED_BUTTON', payload: buttonId });
  }, []);

  const getIconColor = useCallback(
    (buttonId: string, formatTag?: string) => {
      const isActive = formatTag ? state.activeFormats.has(formatTag) : false;
      const isHovered = state.hoveredButton === buttonId;
      return isActive || isHovered ? '#3B82F6' : '#383F45';
    },
    [state.activeFormats, state.hoveredButton]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, []);

  const getEditorData = useCallback((): RichTextEditorData => {
    const textContent = editorRef.current?.textContent || '';
    const hasFormatting = /<\/?(?:b|i|s|u|code|tg-spoiler)>/i.test(state.content);

    return {
      content: state.content,
      htmlContent: state.content,
      textContent,
      hasFormatting,
    };
  }, [state.content]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => {
      document.removeEventListener('selectionchange', updateActiveFormats);
    };
  }, [updateActiveFormats]);

  return {
    state,
    editorRef,
    handleInput,
    handlePaste,
    handleKeyDown,
    applyFormatting,
    setHoveredButton,
    syncContent,
    getIconColor,
    getEditorData,
    reset,
    dispatch,
  };
}
