'use client';

import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Mark, mergeAttributes } from '@tiptap/core';
import styles from './KbRichTextEditor.module.scss';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    kbAccent: {
      toggleKbAccent: () => ReturnType;
    };
  }
}

const AccentMark = Mark.create({
  name: 'kbAccent',

  parseHTML() {
    return [
      { tag: 'span.kb-accent' },
      { tag: 'span[data-kb-accent="true"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'kb-accent', 'data-kb-accent': 'true' }), 0];
  },

  addCommands() {
    return {
      toggleKbAccent:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
};

function normalizeContent(value: string) {
  return (value || '').replace(/==([\s\S]+?)==/g, '<span class="kb-accent">$1</span>');
}

export default function KbRichTextEditor({ value, onChange, placeholder, compact = false }: Props) {
  const [, setVersion] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder: placeholder || 'Введите текст...' }),
      Underline,
      AccentMark,
    ],
    content: normalizeContent(value),
    editorProps: {
      attributes: {
        class: compact ? `${styles.editor} ${styles.editorCompact}` : styles.editor,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.isEmpty ? '' : currentEditor.getHTML());
    },
    onSelectionUpdate: () => {
      setVersion((current) => current + 1);
    },
    onTransaction: () => {
      setVersion((current) => current + 1);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const normalized = normalizeContent(value);
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (current === normalized) return;
    editor.commands.setContent(normalized, { emitUpdate: false });
    setVersion((currentVersion) => currentVersion + 1);
  }, [editor, value]);

  if (!editor) return null;

  const controls = [
    {
      key: 'bold',
      label: 'B',
      active: editor.isActive('bold'),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: 'italic',
      label: 'I',
      active: editor.isActive('italic'),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: 'underline',
      label: 'U',
      active: editor.isActive('underline'),
      onClick: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      key: 'accent',
      label: 'Градиент',
      active: editor.isActive('kbAccent'),
      onClick: () => editor.chain().focus().toggleKbAccent().run(),
    },
    {
      key: 'bullet-list',
      label: '• List',
      active: editor.isActive('bulletList'),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: 'ordered-list',
      label: '1. List',
      active: editor.isActive('orderedList'),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className={compact ? `${styles.wrapper} ${styles.wrapperCompact}` : styles.wrapper}>
      <div className={styles.toolbar}>
        {controls.map((control) => (
          <button
            key={control.key}
            type="button"
            className={control.active ? `${styles.toolButton} ${styles.toolButtonActive}` : styles.toolButton}
            onMouseDown={(event) => event.preventDefault()}
            onClick={control.onClick}
          >
            {control.label}
          </button>
        ))}
      </div>
      <div className={compact ? `${styles.surface} ${styles.surfaceCompact}` : styles.surface}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}