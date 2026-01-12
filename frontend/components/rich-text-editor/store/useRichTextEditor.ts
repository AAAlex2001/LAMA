'use client';

import { useReducer, useCallback, useRef, useEffect } from 'react';
import {
  type FormatType,
  type RichTextEditorState,
  type RichTextEditorData,
  type RichTextEditorAction,
  initialState,
} from './types';

export type { FormatType, RichTextEditorState, RichTextEditorData } from './types';

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

  const updateActiveFormats = useCallback(() => {
    const newFormats = new Set<string>();
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
      return;
    }

    if (document.queryCommandState('bold')) newFormats.add('b');
    if (document.queryCommandState('italic')) newFormats.add('i');
    if (document.queryCommandState('strikeThrough')) newFormats.add('s');
    if (document.queryCommandState('underline')) newFormats.add('u');

    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.getAttribute('data-spoiler') === 'true') newFormats.add('tg-spoiler');
        if (el.tagName.toLowerCase() === 'code') newFormats.add('code');
      }
      node = node.parentNode;
    }

    dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
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

      dispatch({ type: 'SET_IS_EMPTY', payload: !textContent.trim() });
      dispatch({ type: 'SET_CHAR_COUNT', payload: textContent.length });
    
      let html = editorRef.current.innerHTML;
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
      spoilerSpans.forEach(span => {
        const spoilerTag = document.createElement('tg-spoiler');
        while (span.firstChild) {
          spoilerTag.appendChild(span.firstChild);
        }
        span.parentNode?.replaceChild(spoilerTag, span);
      });
      html = tempDiv.innerHTML;
      
      isInternalUpdate.current = true;
      dispatch({ type: 'SET_CONTENT', payload: html });
      
      return html;
    } finally {
      processingRef.current = false;
    }
  }, [maxLength, state.content]);

  const applyFormatting = useCallback((variant: FormatType, spoilerClassName?: string): string | undefined => {
    const editor = editorRef.current;
    if (!editor) return;

    const ensureInlineFormatsEnabled = (formats: Set<string>) => {
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
    };
    
    editor.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);

    if (variant === 'b') {
      const isActive = state.activeFormats.has('b');
      const newFormats = new Set(state.activeFormats);
      if (isActive) {
        newFormats.delete('b');
      } else {
        newFormats.add('b');
      }
      dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
      document.execCommand('bold', false);
      return handleInput();
    }

    if (variant === 'i') {
      const isActive = state.activeFormats.has('i');
      const newFormats = new Set(state.activeFormats);
      if (isActive) {
        newFormats.delete('i');
      } else {
        newFormats.add('i');
      }
      dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
      document.execCommand('italic', false);
      return handleInput();
    }

    if (variant === 's') {
      const isActive = state.activeFormats.has('s');
      const newFormats = new Set(state.activeFormats);
      if (isActive) {
        newFormats.delete('s');
      } else {
        newFormats.add('s');
      }
      dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
      document.execCommand('strikeThrough', false);
      return handleInput();
    }

    if (variant === 'u') {
      const isActive = state.activeFormats.has('u');
      const newFormats = new Set(state.activeFormats);
      if (isActive) {
        newFormats.delete('u');
      } else {
        newFormats.add('u');
      }
      dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
      document.execCommand('underline', false);
      return handleInput();
    }

    if (variant === 'tg-spoiler') {
      const findSpoilerAncestor = (start: Node | null): HTMLElement | null => {
        let current: Node | null = start;
        if (current?.nodeType === Node.TEXT_NODE) current = current.parentNode;
        while (current && current !== editor) {
          if (current.nodeType === Node.ELEMENT_NODE) {
            const el = current as HTMLElement;
            if (el.getAttribute('data-spoiler') === 'true') return el;
          }
          current = current.parentNode;
        }
        return null;
      };

      const unwrapElement = (el: Element) => {
        const fragment = document.createDocumentFragment();
        while (el.firstChild) fragment.appendChild(el.firstChild);
        el.parentNode?.replaceChild(fragment, el);
      };

      const spoilerAtCaret = findSpoilerAncestor(range.commonAncestorContainer);

      if (range.collapsed) {
        if (spoilerAtCaret) {
          const newFormats = new Set(state.activeFormats);
          newFormats.delete('tg-spoiler');
          dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });

          const zwsp = document.createTextNode('\u200B');
          if (spoilerAtCaret.nextSibling) {
            spoilerAtCaret.parentNode?.insertBefore(zwsp, spoilerAtCaret.nextSibling);
          } else {
            spoilerAtCaret.parentNode?.appendChild(zwsp);
          }

          const r = document.createRange();
          r.setStartAfter(zwsp);
          r.collapse(true);
          selection.removeAllRanges();
          selection.addRange(r);
          ensureInlineFormatsEnabled(newFormats);
          updateActiveFormats();

          return handleInput();
        }

        const newFormats = new Set(state.activeFormats);
        newFormats.add('tg-spoiler');
        dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });

        const wrapper = document.createElement('span');
        if (spoilerClassName) wrapper.className = spoilerClassName;
        wrapper.setAttribute('data-spoiler', 'true');

        const zwsp = document.createTextNode('\u200B');
        wrapper.appendChild(zwsp);
        range.insertNode(wrapper);

        const r = document.createRange();
        r.setStart(zwsp, 1);
        r.collapse(true);
        selection.removeAllRanges();
        selection.addRange(r);

        updateActiveFormats();

        return handleInput();
      }

      const spoilers = Array.from(editor.querySelectorAll('span[data-spoiler="true"]'));
      const rangeClone = range.cloneRange();
      
      const intersecting = spoilers.filter((el) => {
        try {
          return rangeClone.intersectsNode(el);
        } catch {
          return false;
        }
      });

      if (intersecting.length > 0) {
        const newFormats = new Set(state.activeFormats);
        newFormats.delete('tg-spoiler');
        dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });

        intersecting.forEach(unwrapElement);

        ensureInlineFormatsEnabled(newFormats);
        updateActiveFormats();

        return handleInput();
      }

      const newFormats = new Set(state.activeFormats);
      newFormats.add('tg-spoiler');
      dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });

      const wrapper = document.createElement('span');
      if (spoilerClassName) wrapper.className = spoilerClassName;
      wrapper.setAttribute('data-spoiler', 'true');

      const contents = range.extractContents();
      wrapper.appendChild(contents);
      range.insertNode(wrapper);

      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      selection.removeAllRanges();
      selection.addRange(newRange);

      updateActiveFormats();

      return handleInput();
    }

    if (variant === 'code') {
      if (range.collapsed) return;

      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      
      let existingCode: Element | null = null;
      let tempNode = node;
      while (tempNode && tempNode !== editor) {
        if (tempNode.nodeType === Node.ELEMENT_NODE) {
          const el = tempNode as Element;
          if (el.tagName.toLowerCase() === 'code') {
            existingCode = el;
            break;
          }
        }
        tempNode = tempNode.parentNode;
      }

      if (existingCode) {
        const text = existingCode.textContent || '';
        const textNode = document.createTextNode(text);
        existingCode.parentNode?.replaceChild(textNode, existingCode);
      } else {
        const wrapper = document.createElement('code');
        const contents = range.extractContents();
        wrapper.appendChild(contents);
        range.insertNode(wrapper);
        
        const br = document.createElement('br');
        if (wrapper.nextSibling) {
          wrapper.parentNode?.insertBefore(br, wrapper.nextSibling);
        } else {
          wrapper.parentNode?.appendChild(br);
        }
        
        range.setStartAfter(br);
        range.setEndAfter(br);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const html = handleInput();
      updateActiveFormats();
      return html;
    }
  }, [handleInput, updateActiveFormats, state.activeFormats]);

  const setHoveredButton = useCallback((buttonId: string | null) => {
    dispatch({ type: 'SET_HOVERED_BUTTON', payload: buttonId });
  }, []);

  const getIconColor = useCallback((buttonId: string, formatTag?: string) => {
    const isActive = formatTag ? state.activeFormats.has(formatTag) : false;
    const isHovered = state.hoveredButton === buttonId;
    return isActive || isHovered ? '#3B82F6' : '#383F45';
  }, [state.activeFormats, state.hoveredButton]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [applyFormatting]);

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
