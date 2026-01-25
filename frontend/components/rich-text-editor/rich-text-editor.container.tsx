'use client';

import { forwardRef, useEffect, useImperativeHandle, useReducer, useRef } from 'react';

import RichTextEditorView from './rich-text-editor';
import { useTiptapEditor } from './editor';
import type { TextFormat } from './editor';
import {
  applyLink,
  applyCodeFromSelection,
  applyQuoteFromSelection,
  focusEditorOnWrapperMouseDown,
  getToolButtonColor,
  handleEmojiSelected,
  initialRichTextEditorState,
  openAiInputFromSelection,
  openLinkInputFromSelection,
  removeLink,
  richTextEditorReducer,
  saveSelectionAsTemplate,
  submitAiEditFromState,
  toggleEmojiPicker,
  closeLinkInput,
} from './store';

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
  ({ value, onChange, placeholder = 'Напишите текст публикации...', maxLength = 4096, onSaveAsTemplate }, ref) => {
    const [uiState, dispatch] = useReducer(richTextEditorReducer, initialRichTextEditorState);
    const linkInputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const lastValue = useRef(value);

    const { editor, state, toggleFormat, insertContent, setAiHighlight } = useTiptapEditor({
      maxLength,
      onUpdate: (html) => {
        const normalized = editor?.isEmpty ? '' : html;
        lastValue.current = normalized;
        onChange(normalized);
      },
    });

    useEffect(() => {
      setAiHighlight(uiState.selectionRange, uiState.showAiInput);
    }, [setAiHighlight, uiState.selectionRange, uiState.showAiInput]);

    useEffect(() => {
      if (!editor) return;

      const currentHtml = editor.getHTML();
      const normalizedCurrent = editor.isEmpty ? '' : currentHtml;

      if (value !== normalizedCurrent) {
        if (!value) {
          editor.commands.clearContent(false);
        } else {
          editor.commands.setContent(value, { emitUpdate: false });
        }
      }

      lastValue.current = value;
    }, [value, editor]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          editor?.commands.clearContent(false);
          onChange('');
        },
      }),
      [editor, onChange],
    );

    const handleTextareaMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!editor) return;
      focusEditorOnWrapperMouseDown({ editor, target: e.target as HTMLElement | null });
    };

    const handleAiButtonMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!editor) return;
      openAiInputFromSelection({ editor, state: uiState, dispatch });
    };

    const handleAiSubmit = async (prompt: string) => {
      if (!editor) return;
      await submitAiEditFromState({ editor, state: uiState, dispatch, prompt });
    };

    const handleLinkClick = () => {
      if (!editor) return;
      openLinkInputFromSelection({ editor, dispatch });
      setTimeout(() => linkInputRef.current?.focus(), 0);
    };

    const handleLinkSubmit = () => {
      if (!editor) return;
      applyLink({ editor, url: uiState.linkUrl, dispatch });
    };

    const handleRemoveLink = () => {
      if (!editor) return;
      removeLink({ editor });
    };

    const formats = state?.formats;
    const charCount = state?.charCount ?? 0;
    const isEmpty = state?.isEmpty ?? true;
    const isLink = editor?.isActive('link') ?? false;
    const isQuote = editor?.isActive('blockquote') ?? false;
    const hasSelection = state?.hasSelection ?? false;

    const handleSaveSelectionAsTemplateMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!editor || !onSaveAsTemplate) return;
      saveSelectionAsTemplate({ editor, onSaveAsTemplate });
    };

    const handleQuoteMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!editor) return;
      if (!hasSelection) return;
      applyQuoteFromSelection(editor);
    };

    const handleEmojiClick = (emojiData: { emoji: string }) => {
      handleEmojiSelected({ emoji: emojiData.emoji, insertContent, dispatch });
    };

    const hoveredButton = uiState.hoveredButton;

    const getButtonColor = (id: NonNullable<typeof hoveredButton>, isActive?: boolean) =>
      getToolButtonColor({ id, hoveredButton, isActive });

    const formatButtons: Array<{
      id: TextFormat;
      format: TextFormat;
      label: string;
      tooltip: string;
      isActive: boolean;
      disabled: boolean;
    }> = [
      { id: 'bold', format: 'bold', label: 'Жирный', tooltip: 'жирный', isActive: Boolean(formats?.bold), disabled: false },
      { id: 'italic', format: 'italic', label: 'Курсив', tooltip: 'курсив', isActive: Boolean(formats?.italic), disabled: false },
      { id: 'strike', format: 'strike', label: 'Зачёркнутый', tooltip: 'зачеркнутый', isActive: Boolean(formats?.strike), disabled: false },
      { id: 'underline', format: 'underline', label: 'Подчёркнутый', tooltip: 'подчеркнутый', isActive: Boolean(formats?.underline), disabled: false },
      { id: 'code', format: 'code', label: 'Код', tooltip: 'код', isActive: Boolean(formats?.code), disabled: !hasSelection },
      { id: 'spoiler', format: 'spoiler', label: 'Скрытый текст', tooltip: 'скрытый', isActive: Boolean(formats?.spoiler), disabled: false },
    ];

    return (
      <RichTextEditorView
        editor={editor}
        placeholder={placeholder}
        maxLength={maxLength}
        wrapperRef={wrapperRef}
        linkInputRef={linkInputRef}
        formatButtons={formatButtons}
        charCount={charCount}
        isEmpty={isEmpty}
        isLink={isLink}
        isQuote={isQuote}
        hasSelection={hasSelection}
        canSaveSelectionAsTemplate={Boolean(onSaveAsTemplate) && hasSelection}
        uiState={uiState}
        onTextareaMouseDown={handleTextareaMouseDown}
        onAiButtonMouseDown={handleAiButtonMouseDown}
        onAiSubmit={handleAiSubmit}
        onToggleFormat={(format) => {
          if (format === 'code') {
            if (!editor) return;
            if (!hasSelection) return;
            applyCodeFromSelection(editor);
            return;
          }
          toggleFormat(format);
        }}
        onQuoteMouseDown={handleQuoteMouseDown}
        onLinkClick={handleLinkClick}
        onLinkSubmit={handleLinkSubmit}
        onRemoveLink={handleRemoveLink}
        onLinkUrlChange={(next) => dispatch({ type: 'SET_LINK_URL', payload: next })}
        onCloseLinkInput={() => closeLinkInput(dispatch)}
        onToggleEmojiPicker={() => toggleEmojiPicker({ current: uiState.showEmojiPicker, dispatch })}
        onEmojiClick={handleEmojiClick}
        onSaveSelectionAsTemplateMouseDown={handleSaveSelectionAsTemplateMouseDown}
        onHover={(id) => dispatch({ type: 'SET_HOVERED_BUTTON', payload: id })}
        getButtonColor={getButtonColor}
      />
    );
  },
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
