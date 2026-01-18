'use client';

import { useEffect, useImperativeHandle, forwardRef, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { DOMSerializer } from '@tiptap/pm/model';

import styles from './rich-text-editor.module.scss';
import { useTiptapEditor } from './editor';
import AiInputBar from '@/components/ai-input-bar';
import Tooltip from '@/components/tooltip/tooltip';
import Loader from '@/components/loader/loader';
import Input from '@/components/input';

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
  CloseIcon,
  CheckIcon,
} from '@/components/icons';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export interface RichTextEditorRef {
  reset: () => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onSaveAsTemplate?: (selectedHtml?: string) => void;
  headerRef?: React.RefObject<HTMLDivElement | null>;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ value, onChange, placeholder = 'Напишите текст публикации...', maxLength = 4096, onSaveAsTemplate, headerRef }, ref) => {
    const [showAiInput, setShowAiInput] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const linkInputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const lastValue = useRef(value);

    const {
      editor,
      state,
      hoveredButton,
      setHoveredButton,
      toggleFormat,
      toggleBlockquote,
      insertContent,
      setContent,
      clearContent,
      getButtonColor,
    } = useTiptapEditor({
      maxLength,
      onUpdate: (html) => {
        lastValue.current = html;
        onChange(html);
      },
    });

    useEffect(() => {
      if (editor && value !== lastValue.current) {
        setContent(value);
        lastValue.current = value;
      }
    }, [value, editor, setContent]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        clearContent();
        onChange('');
      },
    }), [clearContent, onChange]);

    const handleEmojiClick = useCallback((emojiData: { emoji: string }) => {
      insertContent(emojiData.emoji);
      setShowEmojiPicker(false);
    }, [insertContent]);

    const handleTextareaMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!editor) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Клик/drag по самому тексту (ProseMirror) не трогаем, иначе ломается выделение.
      // Но клик по "пустоте" (в том числе внутри обёртки EditorContent) должен ставить курсор.
      const isInsideProseMirror = Boolean(target.closest('.ProseMirror'));
      if (!isInsideProseMirror) editor.commands.focus('end');
    }, [editor]);

    const handleAiButtonMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!editor) return;

      // Toggle off
      if (showAiInput) {
        setShowAiInput(false);
        setSelectedText('');
        setSelectionRange(null);
        return;
      }

      // Open only with a real selection
      const { from, to } = editor.state.selection;
      if (from === to) return;

      const text = editor.state.doc.textBetween(from, to, ' ');
      if (!text.trim()) return;

      setSelectedText(text);
      setSelectionRange({ from, to });
      setShowAiInput(true);
    }, [editor, showAiInput]);

    const getSelectedHtml = useCallback(() => {
      if (!editor) return '';
      const { from, to } = editor.state.selection;
      if (from === to) return '';

      const slice = editor.state.doc.slice(from, to);
      const serializer = DOMSerializer.fromSchema(editor.state.schema);
      const fragment = serializer.serializeFragment(slice.content);
      const container = document.createElement('div');
      container.appendChild(fragment);
      return container.innerHTML;
    }, [editor]);

    const handleSaveSelectionAsTemplateMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!editor || !onSaveAsTemplate) return;
      const { from, to } = editor.state.selection;
      if (from === to) return;

      const html = getSelectedHtml();
      if (!html || !html.trim()) return;
      onSaveAsTemplate(html);
    }, [editor, onSaveAsTemplate, getSelectedHtml]);

    const handleQuoteMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      toggleBlockquote();
    }, [toggleBlockquote]);

    const handleAiSubmit = useCallback(async (prompt: string) => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
        const token = localStorage.getItem('lamaplanner_access_token');
        
        if (!token || !editor || !selectionRange || !selectedText.trim()) return;

        const replaceFrom = selectionRange.from;
        const replaceTo = selectionRange.to;
        let hasAppliedFirstToken = false;
        let insertPos = replaceFrom;
        let accumulated = '';

        const response = await fetch(`${API_BASE_URL}/publications/ai/edit-text-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: selectedText,
            instruction: prompt,
          }),
        });

        if (!response.ok) throw new Error('AI request failed');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamDone = false;

        if (!reader) return;

        const insertDelta = (deltaRaw: string) => {
          if (!deltaRaw) return;

          // Normalize line endings and avoid leaking CR into the editor.
          const delta = deltaRaw.replace(/\r\n/g, '\n').replace(/\r/g, '');
          if (!delta) return;

          const parts = delta.split('\n');
          const content: Array<{ type: 'text'; text: string } | { type: 'hardBreak' }> = [];
          for (let i = 0; i < parts.length; i += 1) {
            const part = parts[i];
            if (part) content.push({ type: 'text', text: part });
            if (i !== parts.length - 1) content.push({ type: 'hardBreak' });
          }

          editor
            .chain()
            .focus()
            .insertContentAt(insertPos, content, { updateSelection: true })
            .run();

          insertPos = editor.state.selection.to;
        };

        const handleData = (dataRaw: string) => {
          const data = dataRaw;

          if (data === '[DONE]') {
            streamDone = true;
            return;
          }
          if (data.startsWith('[ERROR]')) {
            throw new Error(data.replace(/^\[ERROR\]\s*/, ''));
          }

          if (!hasAppliedFirstToken) {
            // Only delete the original selection once we have at least one token,
            // so we don't lose user content if the request fails early.
            editor
              .chain()
              .focus()
              .deleteRange({ from: replaceFrom, to: replaceTo })
              .setTextSelection(replaceFrom)
              .run();
            insertPos = replaceFrom;
            hasAppliedFirstToken = true;
          }

          // Support both incremental token streaming and cumulative streaming.
          let delta = data;
          if (data.startsWith(accumulated)) {
            delta = data.slice(accumulated.length);
            accumulated = data;
          } else {
            accumulated += data;
          }

          insertDelta(delta);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const newlineIndex = buffer.indexOf('\n');
            if (newlineIndex === -1) break;

            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);

            // Empty line separates SSE events; we don't need it.
            if (!line) continue;

            if (line.startsWith('data:')) {
              let data = line.slice(5);
              if (data.startsWith(' ')) data = data.slice(1);
              handleData(data);
              if (streamDone) break;
            }
          }

          if (streamDone) break;
        }

        // Flush decoder + parse tail (in case stream doesn't end with a newline).
        buffer += decoder.decode();
        if (!streamDone && buffer) {
          const tail = buffer.trimEnd();
          if (tail.startsWith('data:')) {
            let data = tail.slice(5);
            if (data.startsWith(' ')) data = data.slice(1);
            handleData(data);
          }
        }

        setShowAiInput(false);
        setSelectedText('');
        setSelectionRange(null);
      } catch (error) {
        console.error('AI edit error:', error);
      }
    }, [editor, selectedText, selectionRange]);

    const handleLinkClick = useCallback(() => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) return;
      setShowLinkInput(true);
      setLinkUrl('');
      setTimeout(() => linkInputRef.current?.focus(), 0);
    }, [editor]);

    const handleLinkSubmit = useCallback(() => {
      if (!editor || !linkUrl.trim()) {
        setShowLinkInput(false);
        return;
      }
      let url = linkUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      editor.chain().focus().setLink({ href: url }).run();
      setShowLinkInput(false);
      setLinkUrl('');
    }, [editor, linkUrl]);

    const handleRemoveLink = useCallback(() => {
      if (!editor) return;
      editor.chain().focus().unsetLink().run();
    }, [editor]);

    const formats = state?.formats;
    const charCount = state?.charCount ?? 0;
    const isEmpty = state?.isEmpty ?? true;
    const isLink = editor?.isActive('link') ?? false;
    const isQuote = editor?.isActive('blockquote') ?? false;
    const hasSelection = state?.hasSelection ?? false;
    const canSaveSelectionAsTemplate = Boolean(onSaveAsTemplate) && hasSelection;

    const formatButtons = [
      { id: 'bold', icon: BoldIcon, format: 'bold' as const, label: 'Жирный', tooltip: 'жирный' },
      { id: 'italic', icon: ItalicIcon, format: 'italic' as const, label: 'Курсив', tooltip: 'курсив' },
      { id: 'strike', icon: StrikethroughIcon, format: 'strike' as const, label: 'Зачёркнутый', tooltip: 'зачеркнутый' },
      { id: 'underline', icon: UnderlineIcon, format: 'underline' as const, label: 'Подчёркнутый', tooltip: 'подчеркнутый' },
      { id: 'code', icon: CodeIcon, format: 'code' as const, label: 'Код', tooltip: 'код' },
      { id: 'spoiler', icon: BlurIcon, format: 'spoiler' as const, label: 'Скрытый текст', tooltip: 'скрытый' },
    ];

    if (!editor) {
      return (
        <div className={styles.textareaWrapper}>
          <div className={styles.textareaInner}>
            <div className={styles.loadingOverlay}>
              <Loader size={20} color="blue" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.textareaWrapper} ref={wrapperRef}>
        <div className={styles.textareaInner} onMouseDown={handleTextareaMouseDown}>
          <EditorContent editor={editor} className={styles.editor} />
          {isEmpty && <div className={styles.placeholder}>{placeholder}</div>}
        </div>

        <BubbleMenu
          key="bubble-menu-v2"
          editor={editor}
          options={{
            placement: 'top-start',
            offset: { mainAxis: 67, crossAxis: -20 },
          }}
        >
          <div className={styles.floatingToolbar}>
            {formatButtons.map(({ id, icon: Icon, format, label }) => (
              <button
                key={id}
                className={styles.floatingButton}
                type="button"
                aria-label={label}
                onMouseDown={(e) => { e.preventDefault(); toggleFormat(format); }}
              >
                <Icon width={18} height={18} color={formats?.[format] ? '#3B82F6' : '#383F45'} />
              </button>
            ))}
            <button
              className={styles.floatingButton}
              type="button"
              aria-label="Ссылка"
              onMouseDown={(e) => { e.preventDefault(); handleLinkClick(); }}
            >
              <LinkIcon width={18} height={18} color={isLink ? '#3B82F6' : '#383F45'} />
            </button>
          </div>
        </BubbleMenu>

        {showLinkInput && (
          <div className={styles.linkInputWrapper}>
            <Input
              inputRef={linkInputRef}
              value={linkUrl}
              onChange={setLinkUrl}
              placeholder="Вставьте ссылку..."
              className={styles.linkInputField}
              variant="white"
              icons={[
                {
                  icon: <CheckIcon width={16} height={16} color="#8C8C8C" />,
                  onClick: handleLinkSubmit,
                  disabled: !linkUrl.trim(),
                  className: styles.linkApplyIcon,
                },
                {
                  icon: <CloseIcon width={16} height={16} color="#8C8C8C" />,
                  onClick: () => setShowLinkInput(false),
                  className: styles.linkCancelIcon,
                },
              ]}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLinkSubmit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowLinkInput(false);
                }
              }}
            />
          </div>
        )}

        {showAiInput && (
          <AiInputBar onSubmit={handleAiSubmit} className={styles.aiInputBar} />
        )}

        <div className={styles.textareaFooter}>
          <div className={styles.textareaTools}>
            <button
              type="button"
              aria-label="AI редактирование"
              aria-disabled={!showAiInput && !hasSelection}
              className={`${styles.toolButton} ${showAiInput ? styles.active : ''} ${!showAiInput && !hasSelection ? styles.toolButtonDisabled : ''}`}
              onMouseDown={handleAiButtonMouseDown}
              onMouseEnter={() => setHoveredButton('ai')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <AiEditIcon width={21} height={21} color={showAiInput ? '#3B82F6' : getButtonColor('ai')} />
              {hoveredButton === 'ai' && <Tooltip text="ии редактор" />}
            </button>

            {formatButtons.map(({ id, icon: Icon, format, label, tooltip }) => (
              <button
                key={id}
                className={`${styles.toolButton} ${styles.desktopOnly}`}
                type="button"
                aria-label={label}
                onMouseDown={(e) => { e.preventDefault(); toggleFormat(format); }}
                onMouseEnter={() => setHoveredButton(id)}
                onMouseLeave={() => setHoveredButton(null)}
              >
                <Icon width={21} height={21} color={getButtonColor(id, formats?.[format])} />
                {hoveredButton === id && <Tooltip text={tooltip} />}
              </button>
            ))}

            <button
              className={`${styles.toolButton} ${styles.desktopOnly}`}
              type="button"
              aria-label="Цитата"
              onMouseDown={handleQuoteMouseDown}
              onMouseEnter={() => setHoveredButton('quote')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <QuoteIcon width={21} height={21} color={getButtonColor('quote', isQuote)} />
              {hoveredButton === 'quote' && <Tooltip text="цитата" />}
            </button>

            <button
              className={`${styles.toolButton} ${styles.desktopOnly}`}
              type="button"
              aria-label="Гиперссылка"
              onMouseDown={(e) => { e.preventDefault(); isLink ? handleRemoveLink() : handleLinkClick(); }}
              onMouseEnter={() => setHoveredButton('link')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <LinkIcon width={21} height={21} color={getButtonColor('link', isLink)} />
              {hoveredButton === 'link' && <Tooltip text={isLink ? 'убрать ссылку' : 'ссылка'} />}
            </button>

            <button
              className={styles.toolButton}
              type="button"
              aria-label="Эмодзи"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              onMouseEnter={() => setHoveredButton('emoji')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <EmojiIcon width={21} height={21} color={showEmojiPicker ? '#3B82F6' : getButtonColor('emoji')} />
              {hoveredButton === 'emoji' && <Tooltip text="эмодзи" />}
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
              type="button"
              aria-label="Сохранить в шаблоны"
              aria-disabled={!canSaveSelectionAsTemplate}
              className={`${styles.toolButton} ${!canSaveSelectionAsTemplate ? styles.toolButtonDisabled : ''}`}
              onMouseDown={handleSaveSelectionAsTemplateMouseDown}
              onMouseEnter={() => setHoveredButton('templates')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <TemplatesIcon width={21} height={21} color={getButtonColor('templates')} />
              {hoveredButton === 'templates' && <Tooltip text="сохранить в шаблоны" />}
            </button>
            <span className={styles.charCount}>{charCount}/{maxLength}</span>
          </div>
        </div>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
