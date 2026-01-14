'use client';

import { useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import styles from './rich-text-editor.module.scss';
import { useRichTextEditor } from './store';
import AiInputBar from '@/components/ai-input-bar';
import Tooltip from '@/components/tooltip/tooltip';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import {
  AiEditIcon,
  EmojiIcon,
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  QuoteIcon,
  CodeIcon,
  BlurIcon,
  StrikethroughIcon,
  UnderlineIcon,
  TemplatesIcon,
} from '@/components/icons';

const MAX_CHARS = 4096;

export interface RichTextEditorRef {
  reset: () => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onSaveAsTemplate?: () => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Напишите текст публикации...',
  maxLength = MAX_CHARS,
  onSaveAsTemplate,
}, ref) => {
  const [showAiInput, setShowAiInput] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const {
    state,
    editorRef,
    handleInput,
    handlePaste,
    handleKeyDown,
    applyFormatting,
    setHoveredButton,
    syncContent,
    getIconColor,
    reset,
  } = useRichTextEditor(maxLength);

  const getSelectedText = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      return selection.toString();
    }
    return '';
  }, []);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    const hasText = !!selection && selection.toString().trim().length > 0;
    setHasSelection(hasText);
    
    if (hasText && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = editorRef.current?.getBoundingClientRect();
      
      if (editorRect) {
        setSelectionPosition({
          top: rect.top - editorRect.top - 50,
          left: rect.left - editorRect.left + (rect.width / 2) - 30,
        });
      }
    }
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const handleAiButtonClick = () => {
    const text = getSelectedText();
    if (text) {
      setSelectedText(text);
      setShowAiInput(true);
    } else {
      setShowAiInput(!showAiInput);
    }
  };

  const handleEmojiClick = useCallback((emojiData: any) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    const selection = window.getSelection();
    let range: Range;
    
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    const textNode = document.createTextNode(emojiData.emoji);
    range.insertNode(textNode);
    
    // Перемещаем курсор после вставленного эмодзи
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    const html = handleInput();
    if (html !== undefined) {
      onChange(html);
    }
    
    setShowEmojiPicker(false);
    editorRef.current.focus();
  }, [editorRef, handleInput, onChange]);

  const handleAiSubmit = async (prompt: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
      const token = typeof window !== 'undefined' ? localStorage.getItem('lamaplanner_access_token') : null;
      
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/publications/ai/edit-text-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: selectedText || value,
          instruction: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('AI request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (!reader || !editorRef.current) return;
      
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        const text = decoder.decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            if (data.startsWith('[ERROR]')) {
              throw new Error(data.slice(8));
            }
            result += data;
          }
        }
        
        // Обновляем innerHTML напрямую
        if (editorRef.current) {
          editorRef.current.innerHTML = result;
        }
      }
      
      // Вызываем handleInput для обновления счетчика и onChange
      if (editorRef.current) {
        const html = handleInput();
        if (html !== undefined) {
          onChange(html);
        }
      }
      
      setShowAiInput(false);
      setSelectedText('');
    } catch (error) {
      console.error('AI edit error:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    reset: () => {
      reset();
      onChange('');
    },
  }), [reset, onChange]);

  useEffect(() => {
    syncContent(value);
  }, [value, syncContent]);

  const onInputChange = () => {
    const html = handleInput();
    if (html !== undefined) {
      onChange(html);
    }
  };

  return (
    <div className={styles.textareaWrapper}>
      <div className={styles.textareaInner}>
        <div
          ref={editorRef}
          className={styles.editor}
          contentEditable
          onInput={onInputChange}
          onPaste={handlePaste}
          onKeyDown={(e) => handleKeyDown(e)}
          suppressContentEditableWarning
        />
        {state.isEmpty && <div className={styles.placeholder}>{placeholder}</div>}
        
        {/* Floating toolbar для мобилки */}
        {hasSelection && (
          <div 
            className={styles.floatingToolbar}
            style={{
              top: `${selectionPosition.top}px`,
              left: `${selectionPosition.left}px`,
            }}
          >
            <button 
              className={styles.floatingButton} 
              type="button" 
              aria-label="Жирный" 
              onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('b'); if (html !== undefined) onChange(html); }}
            >
              <BoldIcon width={21} height={21} color="#383F45" />
            </button>
            <button 
              className={styles.floatingButton} 
              type="button" 
              aria-label="Курсив" 
              onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('i'); if (html !== undefined) onChange(html); }}
            >
              <ItalicIcon width={21} height={21} color="#383F45" />
            </button>
            <button 
              className={styles.floatingButton} 
              type="button" 
              aria-label="Подчеркнутый" 
              onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('u'); if (html !== undefined) onChange(html); }}
            >
              <UnderlineIcon width={21} height={21} color="#383F45" />
            </button>
            <button 
              className={styles.floatingButton} 
              type="button" 
              aria-label="Перечеркнутый" 
              onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('s'); if (html !== undefined) onChange(html); }}
            >
              <StrikethroughIcon width={21} height={21} color="#383F45" />
            </button>
            <button 
              className={styles.floatingButton} 
              type="button" 
              aria-label="Скрытый текст" 
              onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('tg-spoiler', styles.spoiler); if (html !== undefined) onChange(html); }}
            >
              <BlurIcon width={21} height={21} color="#383F45" />
            </button>
            <button 
              className={styles.floatingButton} 
              type="button" 
              aria-label="Код" 
              onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('code'); if (html !== undefined) onChange(html); }}
            >
              <CodeIcon width={21} height={21} color="#383F45" />
            </button>
          </div>
        )}
      </div>
      
      {showAiInput && (
        <AiInputBar 
          onSubmit={handleAiSubmit}
          className={styles.aiInputBar}
        />
      )}
      
      <div className={styles.textareaFooter}>
        <div className={styles.textareaTools}>
          <button 
            className={`${styles.toolButton} ${showAiInput ? styles.active : ''}`} 
            type="button" 
            aria-label="AI редактирование"
            onClick={handleAiButtonClick}
            onMouseEnter={() => setHoveredButton('ai')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <AiEditIcon width={21} height={21} color={showAiInput ? '#3B82F6' : getIconColor('ai')} />
            {state.hoveredButton === 'ai' && <Tooltip text="ии редактор" />}
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Жирный" 
            onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('b'); if (html !== undefined) onChange(html); }}
            onMouseEnter={() => setHoveredButton('b')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <BoldIcon width={21} height={21} color={getIconColor('b', 'b')} />
            {state.hoveredButton === 'b' && <Tooltip text="жирный" />}
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Курсив" 
            onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('i'); if (html !== undefined) onChange(html); }}
            onMouseEnter={() => setHoveredButton('i')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <ItalicIcon width={21} height={21} color={getIconColor('i', 'i')} />
            {state.hoveredButton === 'i' && <Tooltip text="курсив" />}
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Перечеркнутый" 
            onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('s'); if (html !== undefined) onChange(html); }}
            onMouseEnter={() => setHoveredButton('s')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <StrikethroughIcon width={21} height={21} color={getIconColor('s', 's')} />
            {state.hoveredButton === 's' && <Tooltip text="зачеркнутый" />}
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Подчеркнутый" 
            onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('u'); if (html !== undefined) onChange(html); }}
            onMouseEnter={() => setHoveredButton('u')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <UnderlineIcon width={21} height={21} color={getIconColor('u', 'u')} />
            {state.hoveredButton === 'u' && <Tooltip text="подчеркнутый" />}
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Скрытый текст" 
            onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('tg-spoiler', styles.spoiler); if (html !== undefined) onChange(html); }}
            onMouseEnter={() => setHoveredButton('tg-spoiler')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <BlurIcon width={21} height={21} color={getIconColor('tg-spoiler', 'tg-spoiler')} />
            {state.hoveredButton === 'tg-spoiler' && <Tooltip text="скрытый" />}
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Цитата"
            onMouseEnter={() => setHoveredButton('quote')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <QuoteIcon width={21} height={21} color={getIconColor('quote')} />
            {state.hoveredButton === 'quote' && <Tooltip text="цитата" />}
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Гиперссылка"
            onMouseEnter={() => setHoveredButton('link')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <LinkIcon width={21} height={21} color={getIconColor('link')} />
            {state.hoveredButton === 'link' && <Tooltip text="ссылка" />}
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Код" 
            onMouseDown={(e) => { e.preventDefault(); const html = applyFormatting('code'); if (html !== undefined) onChange(html); }}
            onMouseEnter={() => setHoveredButton('code')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <CodeIcon width={21} height={21} color={getIconColor('code', 'code')} />
            {state.hoveredButton === 'code' && <Tooltip text="код" />}
          </button>
          <button 
            className={styles.toolButton} 
            type="button" 
            aria-label="Эмодзи"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            onMouseEnter={() => setHoveredButton('emoji')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <EmojiIcon width={21} height={21} color={showEmojiPicker ? '#3B82F6' : getIconColor('emoji')} />
            {state.hoveredButton === 'emoji' && <Tooltip text="эмодзи" />}
          </button>
          {showEmojiPicker && (
            <div className={styles.emojiPickerWrapper}>
              <EmojiPicker 
                onEmojiClick={handleEmojiClick} 
                width={300} 
                height={300}
                searchDisabled
                skinTonesDisabled
              />
            </div>
          )}
        </div>
        <div className={styles.charCountWrapper}>
          <button 
            className={styles.toolButton} 
            type="button" 
            aria-label="Сохранить в шаблоны"
            onClick={() => onSaveAsTemplate?.()}
            disabled={!onSaveAsTemplate}
            onMouseEnter={() => setHoveredButton('templates')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <TemplatesIcon width={21} height={21} color={getIconColor('templates')} />
            {state.hoveredButton === 'templates' && <Tooltip text="сохранить в шаблоны" />}
          </button>
          <span className={styles.charCount}>{state.charCount}/{maxLength}</span>
        </div>
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
