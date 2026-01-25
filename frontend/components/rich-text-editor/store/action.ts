import type { Editor } from '@tiptap/react';
import type { Dispatch } from 'react';
import { DOMSerializer } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

import { postAiEditTextStream } from './api';
import type { RichTextEditorAction, RichTextEditorState, SelectionRange } from './types';

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
}

function getAccessToken(): string | null {
  return localStorage.getItem('lamaplanner_access_token');
}

export function getToolButtonColor(params: {
  id: NonNullable<RichTextEditorState['hoveredButton']>;
  hoveredButton: RichTextEditorState['hoveredButton'];
  isActive?: boolean;
}): string {
  const { id, hoveredButton, isActive } = params;
  if (isActive || hoveredButton === id) return '#3B82F6';
  return '#383F45';
}

export function openAiInputFromSelection(params: {
  editor: Editor;
  state: RichTextEditorState;
  dispatch: Dispatch<RichTextEditorAction>;
}): void {
  const { editor, state, dispatch } = params;

  if (state.showAiInput) {
    dispatch({ type: 'RESET_AI_CONTEXT' });
    return;
  }

  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;
  const fullFrom = 0;
  const fullTo = editor.state.doc.content.size;

  if (hasSelection) {
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) return;
    dispatch({ type: 'SET_SELECTED_TEXT', payload: text });
    dispatch({ type: 'SET_SELECTION_RANGE', payload: { from, to } });
    dispatch({ type: 'SET_SHOW_AI_INPUT', payload: true });
    return;
  }

  const fullText = editor.state.doc.textBetween(fullFrom, fullTo, ' ');
  dispatch({ type: 'SET_SELECTED_TEXT', payload: fullText });
  dispatch({ type: 'SET_SELECTION_RANGE', payload: { from, to } });
  dispatch({ type: 'SET_SHOW_AI_INPUT', payload: true });
}

export function closeLinkInput(dispatch: Dispatch<RichTextEditorAction>): void {
  dispatch({ type: 'SET_SHOW_LINK_INPUT', payload: false });
}

export function toggleEmojiPicker(params: {
  current: boolean;
  dispatch: Dispatch<RichTextEditorAction>;
}): void {
  params.dispatch({ type: 'SET_SHOW_EMOJI_PICKER', payload: !params.current });
}

export function handleEmojiSelected(params: {
  emoji: string;
  insertContent: (content: string) => void;
  dispatch: Dispatch<RichTextEditorAction>;
}): void {
  params.insertContent(params.emoji);
  params.dispatch({ type: 'SET_SHOW_EMOJI_PICKER', payload: false });
}

export function openLinkInputFromSelection(params: {
  editor: Editor;
  dispatch: Dispatch<RichTextEditorAction>;
}): void {
  const { editor, dispatch } = params;
  const { from, to } = editor.state.selection;
  if (from === to) return;
  dispatch({ type: 'SET_SHOW_LINK_INPUT', payload: true });
  dispatch({ type: 'SET_LINK_URL', payload: '' });
}

export function applyLink(params: {
  editor: Editor;
  url: string;
  dispatch: Dispatch<RichTextEditorAction>;
}): void {
  const { editor, url, dispatch } = params;

  const { from, to } = editor.state.selection;
  if (from === to) {
    dispatch({ type: 'SET_SHOW_LINK_INPUT', payload: false });
    dispatch({ type: 'SET_LINK_URL', payload: '' });
    return;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    dispatch({ type: 'SET_SHOW_LINK_INPUT', payload: false });
    return;
  }

  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  editor.chain().focus().setLink({ href }).run();

  const nextState = editor.state;
  const tr = nextState.tr.setSelection(TextSelection.create(nextState.doc, to)).setStoredMarks([]);
  editor.view.dispatch(tr);
  editor.view.focus();

  dispatch({ type: 'SET_SHOW_LINK_INPUT', payload: false });
  dispatch({ type: 'SET_LINK_URL', payload: '' });
}

export function removeLink(params: { editor: Editor }): void {
  const editor = params.editor;
  const { from, to } = editor.state.selection;

  if (from === to) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    editor.chain().focus().unsetLink().run();
  }

  const nextState = editor.state;
  const tr = nextState.tr
    .setSelection(TextSelection.create(nextState.doc, nextState.selection.to))
    .setStoredMarks([]);
  editor.view.dispatch(tr);
  editor.view.focus();
}

export function focusEditorOnWrapperMouseDown(params: {
  editor: Editor;
  target: HTMLElement | null;
}): void {
  const { editor, target } = params;
  if (!target) return;
  const isInsideProseMirror = Boolean(target.closest('.ProseMirror'));
  if (!isInsideProseMirror) editor.commands.focus('end');
}

export function getSelectedHtml(editor: Editor): string {
  const { from, to } = editor.state.selection;
  if (from === to) return '';

  const slice = editor.state.doc.slice(from, to);
  const serializer = DOMSerializer.fromSchema(editor.state.schema);
  const fragment = serializer.serializeFragment(slice.content);
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

export function saveSelectionAsTemplate(params: {
  editor: Editor;
  onSaveAsTemplate: (selectedHtml?: string) => void;
}): void {
  const { editor, onSaveAsTemplate } = params;
  const { from, to } = editor.state.selection;
  if (from === to) return;

  const html = getSelectedHtml(editor);
  if (!html.trim()) return;
  onSaveAsTemplate(html);
}

export function applyQuoteFromSelection(editor: Editor): void {
  const { from, to } = editor.state.selection;
  if (from === to) return;

  const state = editor.state;
  const schema = state.schema;
  const slice = state.doc.slice(from, to);
  if (slice.content.size === 0) return;

  let allInline = true;
  slice.content.forEach((node) => {
    if (!node.isInline) allInline = false;
  });

  const quoteContent = allInline ? schema.nodes.paragraph.create(null, slice.content) : slice.content;
  const blockquote = schema.nodes.blockquote.create(null, quoteContent);

  const tr = state.tr.replaceRangeWith(from, to, blockquote);
  let quotePos = tr.mapping.map(from);

  const removeEmptyParagraphBefore = () => {
    const $pos = tr.doc.resolve(quotePos);
    const prev = $pos.nodeBefore;
    if (prev?.type.name !== 'paragraph') return;
    if (prev.content.size !== 0) return;
    tr.delete(quotePos - prev.nodeSize, quotePos);
    quotePos -= prev.nodeSize;
  };

  removeEmptyParagraphBefore();

  const quoteNode = tr.doc.nodeAt(quotePos);
  if (!quoteNode || quoteNode.type.name !== 'blockquote') return;

  const afterQuotePos = quotePos + quoteNode.nodeSize;
  const $after = tr.doc.resolve(afterQuotePos);
  const next = $after.nodeAfter;

  if (next?.type.name === 'paragraph') {
    tr.setSelection(TextSelection.create(tr.doc, afterQuotePos + 1));
  } else {
    const paragraph = schema.nodes.paragraph.createAndFill();
    if (paragraph) tr.insert(afterQuotePos, paragraph);
    tr.setSelection(TextSelection.create(tr.doc, afterQuotePos + 1));
  }

  tr.setStoredMarks([]);
  editor.view.dispatch(tr);
  editor.view.focus();
}

export function applyCodeFromSelection(editor: Editor): void {
  const { from, to } = editor.state.selection;
  if (from === to) return;

  editor.chain().focus().toggleCode().run();

  const nextState = editor.state;
  const tr = nextState.tr.setSelection(TextSelection.create(nextState.doc, to)).setStoredMarks([]);
  editor.view.dispatch(tr);
  editor.view.focus();
}

function createSseLineIterator() {
  let buffer = '';
  const decoder = new TextDecoder();

  return {
    push(chunk: Uint8Array): string[] {
      buffer += decoder.decode(chunk, { stream: true });
      const lines: string[] = [];

      while (true) {
        const idx = buffer.indexOf('\n');
        if (idx === -1) break;
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line) lines.push(line);
      }

      return lines;
    },
    flush(): string | null {
      buffer += decoder.decode();
      const tail = buffer.trimEnd();
      buffer = '';
      return tail || null;
    },
  };
}

export async function streamAiReplaceSelection(params: {
  editor: Editor;
  selectionRange: SelectionRange;
  selectedText: string;
  prompt: string;
  apiBaseUrl: string;
  token: string;
  onDone: () => void;
}): Promise<void> {
  const { editor, selectionRange, selectedText, prompt, apiBaseUrl, token, onDone } = params;

  const response = await postAiEditTextStream({
    apiBaseUrl,
    token,
    text: selectedText,
    instruction: prompt,
  });

  if (!response.ok) throw new Error('AI request failed');

  const reader = response.body?.getReader();
  if (!reader) return;

  const iterator = createSseLineIterator();

  const replaceFrom = selectionRange.from;
  const replaceTo = selectionRange.to;
  const insertOnly = replaceFrom === replaceTo;
  let hasAppliedFirstToken = false;
  let insertPos = replaceFrom;
  let accumulated = '';
  let streamDone = false;
  let trailingHardBreaks = 0;

  const insertDelta = (deltaRaw: string) => {
    if (!deltaRaw) return;
    const delta = deltaRaw.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ');
    if (!delta) return;

    const content: Array<{ type: 'text'; text: string }> = [{ type: 'text', text: delta }];

    editor.chain().focus().insertContentAt(insertPos, content, { updateSelection: true }).run();
    insertPos = editor.state.selection.to;

    trailingHardBreaks = 0;
  };

  const handleData = (data: string) => {
    if (data === '[DONE]') {
      streamDone = true;
      return;
    }
    if (data.startsWith('[ERROR]')) {
      throw new Error(data.replace(/^\[ERROR\]\s*/, ''));
    }

    if (!hasAppliedFirstToken) {
      if (!insertOnly) {
        editor.chain().focus().deleteRange({ from: replaceFrom, to: replaceTo }).setTextSelection(replaceFrom).run();
      } else {
        editor.chain().focus().setTextSelection(replaceFrom).run();
      }
      insertPos = replaceFrom;
      hasAppliedFirstToken = true;
    }

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
    if (!value) continue;

    const lines = iterator.push(value);
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      let data = line.slice(5);
      if (data.startsWith(' ')) data = data.slice(1);
      handleData(data);
      if (streamDone) break;
    }

    if (streamDone) break;
  }

  const tail = iterator.flush();
  if (!streamDone && tail?.startsWith('data:')) {
    let data = tail.slice(5);
    if (data.startsWith(' ')) data = data.slice(1);
    handleData(data);
  }

  if (trailingHardBreaks > 0) {
    let removed = 0;
    while (removed < trailingHardBreaks && insertPos > 0) {
      const node = editor.state.doc.nodeAt(insertPos - 1);
      if (!node || node.type.name !== 'hardBreak') break;
      editor.chain().focus().deleteRange({ from: insertPos - 1, to: insertPos }).run();
      insertPos -= 1;
      removed += 1;
    }
  }

  onDone();
}

export async function submitAiEditFromState(params: {
  editor: Editor;
  state: RichTextEditorState;
  dispatch: Dispatch<RichTextEditorAction>;
  prompt: string;
}): Promise<void> {
  try {
    const token = getAccessToken();
    if (!token) return;
    const docSize = params.editor.state.doc.content.size;
    const selection = params.editor.state.selection;
    const fallbackRange = docSize > 0
      ? { from: 0, to: docSize }
      : { from: selection.from, to: selection.to };
    const selectionRange = params.state.selectionRange || fallbackRange;
    const selectionText = params.state.selectedText?.trim()
      ? params.state.selectedText
      : params.editor.state.doc.textBetween(0, docSize, ' ');

    params.dispatch({ type: 'SET_SELECTION_RANGE', payload: null });

    await streamAiReplaceSelection({
      editor: params.editor,
      selectionRange,
      selectedText: selectionText,
      prompt: params.prompt,
      apiBaseUrl: getApiBaseUrl(),
      token,
      onDone: () => params.dispatch({ type: 'RESET_AI_CONTEXT' }),
    });
  } catch (error) {
    console.error('AI edit error:', error);
  }
}
