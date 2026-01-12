'use client';

import { useEffect, useImperativeHandle, forwardRef } from 'react';
import styles from './rich-text-editor.module.scss';
import { useRichTextEditor } from './store';
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
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Напишите текст публикации...',
  maxLength = MAX_CHARS,
}, ref) => {
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
      </div>
      <div className={styles.textareaFooter}>
        <div className={styles.textareaTools}>
          <button 
            className={styles.toolButton} 
            type="button" 
            aria-label="AI редактирование"
            onMouseEnter={() => setHoveredButton('ai')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <AiEditIcon width={21} height={21} color={getIconColor('ai')} />
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
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Цитата"
            onMouseEnter={() => setHoveredButton('quote')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <QuoteIcon width={21} height={21} color={getIconColor('quote')} />
          </button>
          <button 
            className={`${styles.toolButton} ${styles.desktopOnly}`} 
            type="button" 
            aria-label="Гиперссылка"
            onMouseEnter={() => setHoveredButton('link')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <LinkIcon width={21} height={21} color={getIconColor('link')} />
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
          </button>
          <button 
            className={styles.toolButton} 
            type="button" 
            aria-label="Эмодзи"
            onMouseEnter={() => setHoveredButton('emoji')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <EmojiIcon width={21} height={21} color={getIconColor('emoji')} />
          </button>
        </div>
        <div className={styles.charCountWrapper}>
          <button className={styles.toolButton} type="button" aria-label="Подсчет символов">
            <TemplatesIcon width={21} height={21} />
          </button>
          <span className={styles.charCount}>{state.charCount}/{maxLength}</span>
        </div>
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
