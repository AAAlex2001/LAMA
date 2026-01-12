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

    case 'TOGGLE_FORMAT': {
      const newFormats = new Set(state.activeFormats);
      if (newFormats.has(action.payload)) {
        newFormats.delete(action.payload);
      } else {
        newFormats.add(action.payload);
      }
      return { ...state, activeFormats: newFormats };
    }

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

  const getTextContent = useCallback(() => {
    if (!editorRef.current) return '';
    return editorRef.current.textContent || '';
  }, []);

  const checkSpoilerInSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.getAttribute('data-spoiler') === 'true' || 
            element.classList.contains('spoiler')) {
          return true;
        }
      }
      node = node.parentNode;
    }
    
    return false;
  }, []);

  const checkCodeInSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    
    const findCodeParent = (node: Node | null): Element | null => {
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.tagName.toLowerCase() === 'code') {
            return element;
          }
        }
        node = node.parentNode;
      }
      return null;
    };
    
    let startNode: Node | null = range.startContainer;
    if (startNode.nodeType === Node.TEXT_NODE) {
      startNode = startNode.parentNode;
    }
    
    let endNode: Node | null = range.endContainer;
    if (endNode.nodeType === Node.TEXT_NODE) {
      endNode = endNode.parentNode;
    }
    
    if (findCodeParent(startNode) || findCodeParent(endNode)) {
      return true;
    }
    
    if (!editorRef.current) return false;
    const codeElements = editorRef.current.querySelectorAll('code');
    for (const code of codeElements) {
      if (range.intersectsNode(code)) {
        return true;
      }
    }
    
    return false;
  }, []);

  const updateActiveFormats = useCallback(() => {
    const newFormats = new Set<string>();
    
    if (document.queryCommandState('bold')) newFormats.add('b');
    if (document.queryCommandState('italic')) newFormats.add('i');
    if (document.queryCommandState('strikeThrough')) newFormats.add('s');
    if (document.queryCommandState('underline')) newFormats.add('u');
    if (checkSpoilerInSelection()) newFormats.add('tg-spoiler');
    if (checkCodeInSelection()) newFormats.add('code');
    
    dispatch({ type: 'SET_ACTIVE_FORMATS', payload: newFormats });
  }, [checkSpoilerInSelection, checkCodeInSelection]);

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

  const handleInput = useCallback(() => {
    if (!editorRef.current) return '';
    
    editorRef.current.querySelectorAll('code').forEach(codeEl => {
      if (!codeEl.textContent?.trim()) {
        codeEl.remove();
      }
    });
    
    editorRef.current.querySelectorAll('span[data-spoiler="true"]').forEach(spoilerEl => {
      if (!spoilerEl.textContent?.trim()) {
        spoilerEl.remove();
      }
    });
    
    const textContent = editorRef.current.textContent || '';
    
    if (textContent.length > maxLength) {
      editorRef.current.innerHTML = state.content;
      
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      
      return state.content;
    }
    
    dispatch({ type: 'SET_IS_EMPTY', payload: !textContent.trim() });
    dispatch({ type: 'SET_CHAR_COUNT', payload: textContent.length });
    
    let html = editorRef.current.innerHTML;
    
    html = html
      .replace(/\u200B/g, '')
      .replace(/<strong>/gi, '<b>')
      .replace(/<\/strong>/gi, '</b>')
      .replace(/<em>/gi, '<i>')
      .replace(/<\/em>/gi, '</i>')
      .replace(/<strike>/gi, '<s>')
      .replace(/<\/strike>/gi, '</s>')
      .replace(/<del>/gi, '<s>')
      .replace(/<\/del>/gi, '</s>')
      .replace(/<span[^>]*data-spoiler="true"[^>]*>/gi, '<tg-spoiler>')
      .replace(/<\/span>/gi, (match, offset, string) => {
        const beforeMatch = string.substring(0, offset);
        const lastTgSpoilerOpen = beforeMatch.lastIndexOf('<tg-spoiler>');
        const lastTgSpoilerClose = beforeMatch.lastIndexOf('</tg-spoiler>');
        if (lastTgSpoilerOpen > lastTgSpoilerClose) {
          return '</tg-spoiler>';
        }
        return match;
      });
    
    isInternalUpdate.current = true;
    dispatch({ type: 'SET_CONTENT', payload: html });
    
    return html;
  }, [maxLength, state.content]);

  const findParentWrapper = useCallback((tag: 'tg-spoiler' | 'code'): Element | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }
    
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (tag === 'tg-spoiler' && (element.getAttribute('data-spoiler') === 'true' || element.classList.contains('spoiler'))) {
          return element;
        }
        if (tag === 'code' && element.tagName.toLowerCase() === 'code') {
          return element;
        }
      }
      node = node.parentNode;
    }
    
    return null;
  }, []);

  const applyFormatting = useCallback((command: string, tag: FormatType, spoilerClassName?: string) => {
    editorRef.current?.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const isInsideCode = checkCodeInSelection();
    if (isInsideCode && tag !== 'code') return;
    
    if (tag === 'tg-spoiler' || tag === 'code') {
      const range = selection.getRangeAt(0);
      
      if (range.collapsed) {
        const parentWrapper = findParentWrapper(tag);
        if (parentWrapper) {
          const zwsp = document.createTextNode('\u200B');
          if (parentWrapper.nextSibling) {
            parentWrapper.parentNode?.insertBefore(zwsp, parentWrapper.nextSibling);
          } else {
            parentWrapper.parentNode?.appendChild(zwsp);
          }
          
          range.setStartAfter(zwsp);
          range.setEndAfter(zwsp);
          selection.removeAllRanges();
          selection.addRange(range);
          
          updateActiveFormats();
        }
        return;
      }
      
      const wrapper = document.createElement(tag === 'code' ? 'code' : 'span');
      
      if (tag === 'tg-spoiler' && spoilerClassName) {
        wrapper.className = spoilerClassName;
        wrapper.setAttribute('data-spoiler', 'true');
      }
      
      const contents = range.cloneContents();
      wrapper.appendChild(contents);
      range.deleteContents();
      range.insertNode(wrapper);
      
      const zwsp = document.createTextNode('\u200B');
      if (wrapper.nextSibling) {
        wrapper.parentNode?.insertBefore(zwsp, wrapper.nextSibling);
      } else {
        wrapper.parentNode?.appendChild(zwsp);
      }
      
      range.setStartAfter(zwsp);
      range.setEndAfter(zwsp);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      document.execCommand(command, false);
    }
    
    handleInput();
    updateActiveFormats();
  }, [updateActiveFormats, handleInput, findParentWrapper, checkCodeInSelection]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent, spoilerClassName?: string) => {
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      applyFormatting('bold', 'b');
    }
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      applyFormatting('italic', 'i');
    }
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      applyFormatting('underline', 'u');
    }
  }, [applyFormatting]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, []);

  const getEditorData = useCallback((): RichTextEditorData => {
    const textContent = getTextContent();
    const hasFormatting = /<\/?(?:b|i|s|u|code|pre|tg-spoiler)>/i.test(state.content);
    
    return {
      content: state.content,
      htmlContent: state.content,
      textContent,
      hasFormatting,
    };
  }, [state.content, getTextContent]);

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
    getTextContent,
    getEditorData,
    reset,
    dispatch,
  };
}
