'use client';

import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import styles from '../rich-text-editor.module.scss';

interface EditorAreaProps {
  editor: Editor | null;
  isEmpty: boolean;
  placeholder: string;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function EditorArea({ editor, isEmpty, placeholder, onMouseDown }: EditorAreaProps) {
  return (
    <div className={styles.textareaInner} onMouseDown={onMouseDown}>
      {editor && <EditorContent editor={editor} className={styles.editor} />}
      {isEmpty && <div className={styles.placeholder}>{placeholder}</div>}
    </div>
  );
}
