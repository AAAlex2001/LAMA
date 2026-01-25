'use client';

import { useEditor, useEditorState } from '@tiptap/react';
import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { SelectionRange } from '../store/types';

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

function getTextForCount(doc: ProseMirrorNode): string {
  const blocks: string[] = [];

  for (let i = 0; i < doc.childCount; i += 1) {
    const node = doc.child(i);
    if (node.type.name === 'blockquote') {
      const inner: string[] = [];
      for (let j = 0; j < node.childCount; j += 1) {
        const child = node.child(j);
        inner.push(child.textContent);
      }
      blocks.push(inner.join('\n'));
    } else {
      blocks.push(node.textContent);
    }
  }

  return blocks.join('\n');
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

const aiSelectionKey = new PluginKey<{ range: SelectionRange | null; enabled: boolean }>('aiSelectionHighlight');

function getOverflowDecorations(doc: ProseMirrorNode, limit: number) {
  if (!limit || limit < 1) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  let count = 0;
  let seenTextBlock = false;

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      if (seenTextBlock) count += 1;
      seenTextBlock = true;
    }
    if (!node.isText || !node.text) return;

    const text = node.text;
    const graphemes = Array.from(text);
    const nodeCount = graphemes.length;

    if (count >= limit) {
      decorations.push(Decoration.inline(pos, pos + text.length, { style: 'color: #EF4444;' }));
      count += nodeCount;
      return;
    }

    if (count + nodeCount <= limit) {
      count += nodeCount;
      return;
    }

    const overflowStartIndex = limit - count;
    const before = graphemes.slice(0, overflowStartIndex).join('');
    const startPos = pos + before.length;
    decorations.push(Decoration.inline(startPos, pos + text.length, { style: 'color: #EF4444;' }));
    count += nodeCount;
  });

  return DecorationSet.create(doc, decorations);
}

export function useTiptapEditor(options: UseTiptapEditorOptions = {}) {
  const { maxLength = 4096, onUpdate } = options;

  const OverLimitHighlight = Extension.create({
    name: 'overLimitHighlight',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations(state) {
              return getOverflowDecorations(state.doc, maxLength);
            },
          },
        }),
      ];
    },
  });

  const AiSelectionHighlight = Extension.create({
    name: 'aiSelectionHighlight',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: aiSelectionKey,
          state: {
            init: () => ({ range: null, enabled: false }),
            apply(tr, prev) {
              const meta = tr.getMeta(aiSelectionKey);
              if (meta) return meta;
              return prev;
            },
          },
          props: {
            decorations(state) {
              const meta = aiSelectionKey.getState(state);
              if (!meta?.enabled || !meta.range) return null;
              const { from, to } = meta.range;
              if (from === to) return null;
              return DecorationSet.create(state.doc, [
                Decoration.inline(from, to, { class: 'aiHighlight' }),
              ]);
            },
          },
        }),
      ];
    },
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      SpoilerMark,
      OverLimitHighlight,
      AiSelectionHighlight,
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
      const text = getTextForCount(ctx.editor.state.doc);
      
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

  const toggleFormat = (format: TextFormat) => {
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
  };

  const insertContent = (content: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(content).run();
  };

  return {
    editor,
    state: editorState,
    toggleFormat,
    insertContent,
    setAiHighlight: (range: SelectionRange | null, enabled: boolean) => {
      if (!editor) return;
      editor.view.dispatch(editor.state.tr.setMeta(aiSelectionKey, { range, enabled }));
    },
  };
}
