import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ButtonRow, InlineButton, InlineButtonType } from '../types';

interface InlineButtonsState {
  isOpen: boolean;
  rows: ButtonRow[];
}

const initialState: InlineButtonsState = {
  isOpen: false,
  rows: [],
};

function createButton(): InlineButton {
  return {
    id: `btn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text: '',
    type: 'url',
    url: '',
  };
}

function createRow(): ButtonRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    buttons: [createButton()],
  };
}

const inlineButtonsSlice = createSlice({
  name: 'inlineButtons',
  initialState,
  reducers: {
    open(state) {
      state.isOpen = true;
      if (state.rows.length === 0) {
        state.rows = [createRow()];
      }
    },
    close(state) {
      state.isOpen = false;
      state.rows = [];
    },
    toggle(state) {
      if (state.isOpen) {
        state.isOpen = false;
        state.rows = [];
      } else {
        state.isOpen = true;
        if (state.rows.length === 0) {
          state.rows = [createRow()];
        }
      }
    },
    setRows(state, action: PayloadAction<ButtonRow[]>) {
      state.rows = action.payload;
    },
    addRow(state) {
      state.rows.push(createRow());
    },
    addColumn(state, action: PayloadAction<string>) {
      const rowId = action.payload;
      const row = state.rows.find(r => r.id === rowId);
      if (row) {
        row.buttons.push(createButton());
      }
    },
    updateButton(state, action: PayloadAction<{ rowId: string; buttonId: string; updates: Partial<InlineButton> }>) {
      const { rowId, buttonId, updates } = action.payload;
      const row = state.rows.find(r => r.id === rowId);
      if (row) {
        const button = row.buttons.find(b => b.id === buttonId);
        if (button) {
          Object.assign(button, updates);
        }
      }
    },
    deleteButton(state, action: PayloadAction<{ rowId: string; buttonId: string }>) {
      const { rowId, buttonId } = action.payload;
      const rowIndex = state.rows.findIndex(r => r.id === rowId);
      if (rowIndex !== -1) {
        const row = state.rows[rowIndex];
        row.buttons = row.buttons.filter(b => b.id !== buttonId);
        if (row.buttons.length === 0) {
          state.rows.splice(rowIndex, 1);
        }
      }
    },
    reset(state) {
      state.isOpen = false;
      state.rows = [];
    },
  },
});

export const {
  open: openInlineButtons,
  close: closeInlineButtons,
  toggle,
  setRows,
  addRow,
  addColumn,
  updateButton,
  deleteButton,
  reset: resetInlineButtons,
} = inlineButtonsSlice.actions;

export const toggleInlineButtons = inlineButtonsSlice.actions.toggle;

export default inlineButtonsSlice.reducer;
