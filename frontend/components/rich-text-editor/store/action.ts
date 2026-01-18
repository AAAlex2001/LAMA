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
  if (from === to) return;

  const text = editor.state.doc.textBetween(from, to, ' ');
  if (!text.trim()) return;

  dispatch({ type: 'SET_SELECTED_TEXT', payload: text });
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

  const selectedHtml = getSelectedHtml(editor).trim();
  if (!selectedHtml) return;

  const isProbablyBlockHtml = /^<(p|h[1-6]|ul|ol|pre|blockquote|div)(\s|>)/i.test(selectedHtml);
  const wrapped = isProbablyBlockHtml
    ? `<blockquote>${selectedHtml}</blockquote>`
    : `<blockquote><p>${selectedHtml}</p></blockquote>`;

  editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, wrapped, { updateSelection: true }).run();

  const currentPos = editor.state.selection.to;
  const $pos = editor.state.doc.resolve(currentPos);

  let afterQuotePos: number | null = null;
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name === 'blockquote') {
      afterQuotePos = $pos.after(depth);
      break;
    }
  }

  if (afterQuotePos == null) return;

  editor.chain().focus().insertContentAt(afterQuotePos, { type: 'paragraph' }, { updateSelection: false }).run();
  editor.commands.setTextSelection(afterQuotePos + 1);
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
  let hasAppliedFirstToken = false;
  let insertPos = replaceFrom;
  let accumulated = '';
  let streamDone = false;

  const insertDelta = (deltaRaw: string) => {
    if (!deltaRaw) return;
    const delta = deltaRaw.replace(/\r\n/g, '\n').replace(/\r/g, '');
    if (!delta) return;

    const parts = delta.split('\n');
    const content: Array<{ type: 'text'; text: string } | { type: 'hardBreak' }> = [];

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part) content.push({ type: 'text', text: part });
      if (i !== parts.length - 1) content.push({ type: 'hardBreak' });
    }

    editor.chain().focus().insertContentAt(insertPos, content, { updateSelection: true }).run();
    insertPos = editor.state.selection.to;
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
      editor.chain().focus().deleteRange({ from: replaceFrom, to: replaceTo }).setTextSelection(replaceFrom).run();
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
    if (!params.state.selectionRange || !params.state.selectedText.trim()) return;

    await streamAiReplaceSelection({
      editor: params.editor,
      selectionRange: params.state.selectionRange,
      selectedText: params.state.selectedText,
      prompt: params.prompt,
      apiBaseUrl: getApiBaseUrl(),
      token,
      onDone: () => params.dispatch({ type: 'RESET_AI_CONTEXT' }),
    });
  } catch (error) {
    console.error('AI edit error:', error);
  }
}
