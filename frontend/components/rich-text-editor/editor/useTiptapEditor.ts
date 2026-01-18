'use client';

import { useCallback } from 'react';
import { useEditor, useEditorState } from '@tiptap/react';
import { Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';

import type { TextFormat, EditorState } from './types';
import { isValidUrl } from './link-utils';

function countGraphemes(text: string): number {
  const Segmenter = (Intl as any)?.Segmenter as
    | (new (locales?: string | string[], options?: { granularity: 'grapheme' }) => {
        segment: (input: string) => Iterable<{ segment: string }>;
      })
    | undefined;

  if (Segmenter) {
    const segmenter = new Segmenter(undefined, { granularity: 'grapheme' });
    let count = 0;
    for (const _ of segmenter.segment(text)) count += 1;
    return count;
  }

  return Array.from(text).length;
}

const SpoilerMark = Mark.create({
  name: 'spoiler',
  
  inclusive: true,
  
  parseHTML() {
    return [
      { tag: 'tg-spoiler' },
      { tag: 'span.spoiler' },
      { tag: 'span[data-spoiler]' },
    ];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['tg-spoiler', mergeAttributes(HTMLAttributes), 0];
  },
});

interface UseTiptapEditorOptions {
  maxLength?: number;
  onUpdate?: (html: string) => void;
}

export function useTiptapEditor(options: UseTiptapEditorOptions = {}) {
  const { maxLength = 4096, onUpdate } = options;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      SpoilerMark,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https'],
        isAllowedUri: (url, ctx) => {
          try {
            const parsed = url.includes(':')
              ? new URL(url)
              : new URL(`${ctx.defaultProtocol}://${url}`);
            
            if (!ctx.defaultValidate(parsed.href)) return false;
            
            const protocol = parsed.protocol.replace(':', '');
            const allowed = ctx.protocols.map(p => typeof p === 'string' ? p : p.scheme);
            if (!allowed.includes(protocol)) return false;
            
            return isValidUrl(parsed.href);
          } catch {
            return false;
          }
        },
        shouldAutoLink: (url) => {
          try {
            return isValidUrl(url);
          } catch {
            return false;
          }
        },
      }),
      CharacterCount.configure({
        limit: maxLength,
        mode: 'textSize',
      }),
    ],
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
  });

  const editorState = useEditorState({
    editor,
    selector: (ctx): EditorState | null => {
      if (!ctx.editor) return null;
      
      const { from, to } = ctx.editor.state.selection;
      const text = ctx.editor.getText({ blockSeparator: '\n' });
      
      return {
        html: ctx.editor.getHTML(),
        text,
        charCount: countGraphemes(text),
        isEmpty: ctx.editor.isEmpty,
        hasSelection: from !== to,
        formats: {
          bold: ctx.editor.isActive('bold'),
          italic: ctx.editor.isActive('italic'),
          underline: ctx.editor.isActive('underline'),
          strike: ctx.editor.isActive('strike'),
          code: ctx.editor.isActive('code'),
          spoiler: ctx.editor.isActive('spoiler'),
        },
      };
    },
  });

  const toggleFormat = useCallback((format: TextFormat) => {
    if (!editor) return;
    
    const chain = editor.chain().focus();
    
    switch (format) {
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'underline':
        chain.toggleUnderline().run();
        break;
      case 'strike':
        chain.toggleStrike().run();
        break;
      case 'code':
        chain.toggleCode().run();
        break;
      case 'spoiler':
        editor.chain().focus().toggleMark('spoiler').run();
        return;
    }
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const insertContent = useCallback((content: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(content).run();
  }, [editor]);

  const setContent = useCallback((html: string) => {
    if (!editor) return;
    if (html !== editor.getHTML()) {
      editor.commands.setContent(html);
    }
  }, [editor]);

  const clearContent = useCallback(() => {
    editor?.commands.clearContent(true);
  }, [editor]);

  return {
    editor,
    state: editorState,
    toggleFormat,
    toggleBlockquote,
    insertContent,
    setContent,
    clearContent,
  };
}
