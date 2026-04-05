'use client';

import { useEditor, useEditorState } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Code from '@tiptap/extension-code';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { SelectionRange } from '../store/types';

import type { TextFormat, EditorState } from './types';
import { isValidUrl } from './link-utils';
import { detectLanguage, isCodeLike } from './detect-language';
import nginxLang from 'highlight.js/lib/languages/nginx';
import dockerfileLang from 'highlight.js/lib/languages/dockerfile';

const lowlight = createLowlight(common);
lowlight.register('nginx', nginxLang);
lowlight.register('dockerfile', dockerfileLang);

const CustomCodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    return [
      'pre',
      { ...HTMLAttributes, 'data-language': node.attrs.language || 'plaintext' },
      ['code', { class: node.attrs.language ? `language-${node.attrs.language}` : '' }, 0],
    ];
  },
});

const MonospaceCode = Code.extend({
  addAttributes() {
    return {
      dataLanguage: {
        default: 'monospace',
        renderHTML: (attributes) => ({ 'data-language': attributes.dataLanguage }),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['code', mergeAttributes(HTMLAttributes), 0];
  },
});

const AutoCodeDetect = Extension.create({
  name: 'autoCodeDetect',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false;

            if (view.state.selection.$from.parent.type.name === 'codeBlock') {
              return false;
            }

            if (isCodeLike(text)) {
              const lang = detectLanguage(text);
              const { tr } = view.state;
              const node = view.state.schema.nodes.codeBlock.create(
                { language: lang },
                view.state.schema.text(text)
              );
              tr.replaceSelectionWith(node);
              view.dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

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
  const isAutoCodeApplying = useRef(false);
  const maxLengthRef = useRef(maxLength);
  maxLengthRef.current = maxLength;

  const OverLimitHighlight = Extension.create({
    name: 'overLimitHighlight',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            decorations(state) {
              return getOverflowDecorations(state.doc, maxLengthRef.current);
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
    editorProps: {
      transformPastedHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        div.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
          const p = document.createElement('p');
          p.innerHTML = el.innerHTML;
          el.replaceWith(p);
        });
        div.querySelectorAll('li').forEach(el => {
          const p = document.createElement('p');
          p.innerHTML = el.innerHTML;
          el.replaceWith(p);
        });
        div.querySelectorAll('ul,ol').forEach(el => {
          const frag = document.createDocumentFragment();
          while (el.firstChild) frag.appendChild(el.firstChild);
          el.replaceWith(frag);
        });
        div.querySelectorAll('blockquote').forEach(el => {
          const frag = document.createDocumentFragment();
          while (el.firstChild) frag.appendChild(el.firstChild);
          el.replaceWith(frag);
        });
        div.querySelectorAll('hr').forEach(el => el.remove());
        return div.innerHTML;
      },
    },
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        code: false,
        link: false,
        underline: false,
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      MonospaceCode,
      CustomCodeBlock.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }),
      AutoCodeDetect,
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
      if (!isAutoCodeApplying.current && !editor.isActive('codeBlock')) {
        const doc = editor.state.doc;
        if (doc.childCount === 1 && doc.firstChild?.type.name === 'paragraph') {
          const text = doc.textBetween(0, doc.content.size, '\n');
          if (isCodeLike(text)) {
            const lang = detectLanguage(text);
            isAutoCodeApplying.current = true;
            editor.chain().focus().setNode('codeBlock', { language: lang }).run();
            isAutoCodeApplying.current = false;
          }
        }
      }
      onUpdate?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr);
    }
  }, [maxLength, editor]);

  const editorState = useEditorState({
    editor,
    selector: (ctx): EditorState | null => {
      if (!ctx.editor) return null;

      const { from, to } = ctx.editor.state.selection;
      const text = getTextForCount(ctx.editor.state.doc);
      const isInCodeBlock = ctx.editor.isActive('codeBlock');
      const codeBlockAttrs = isInCodeBlock ? ctx.editor.getAttributes('codeBlock') : null;

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
          monospace: ctx.editor.isActive('code'),
          spoiler: ctx.editor.isActive('spoiler'),
        },
        isInCodeBlock,
        codeBlockLanguage: codeBlockAttrs?.language || null,
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
      case 'monospace':
        chain.toggleCode().run();
        break;
      case 'code':
        chain.toggleCodeBlock().run();
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

  const insertCodeBlock = (code: string, language?: string) => {
    if (!editor) return;
    const detectedLang = language || detectLanguage(code);
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'codeBlock',
        attrs: { language: detectedLang },
        content: [{ type: 'text', text: code }],
      })
      .run();
  };

  const toggleCodeBlock = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    if (from !== to) {
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      const detectedLang = detectLanguage(selectedText);
      editor
        .chain()
        .focus()
        .toggleCodeBlock({ language: detectedLang })
        .run();
    } else {
      editor.chain().focus().toggleCodeBlock().run();
    }
  };

  const updateCodeBlockLanguage = (language: string) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes('codeBlock', { language }).run();
  };

  return {
    editor,
    state: editorState,
    toggleFormat,
    insertContent,
    insertCodeBlock,
    toggleCodeBlock,
    updateCodeBlockLanguage,
    setAiHighlight: (range: SelectionRange | null, enabled: boolean) => {
      if (!editor) return;
      editor.view.dispatch(editor.state.tr.setMeta(aiSelectionKey, { range, enabled }));
    },
  };
}
