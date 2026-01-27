import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PostSnapshot, QuizMode, QuizAnswer, ButtonRow, MediaFile } from '../types';

function createEmptySnapshot(): PostSnapshot {
  return {
    text: '',
    mediaFiles: [],
    inlineButtonsOpen: false,
    buttonRows: [],
    quizOpen: false,
    quizMode: 'poll_single',
    quizQuestion: '',
    quizAnswers: [
      { id: `ans-${Date.now()}-1`, text: '' },
      { id: `ans-${Date.now()}-2`, text: '' },
    ],
    quizCorrectAnswerId: null,
    showLinkPreview: false,
  };
}

interface SeriesState {
  snapshots: PostSnapshot[];
  activeIndex: number;
}

const initialState: SeriesState = {
  snapshots: [createEmptySnapshot()],
  activeIndex: 0,
};

const seriesSlice = createSlice({
  name: 'series',
  initialState,
  reducers: {
    addPost(state) {
      state.snapshots.push(createEmptySnapshot());
      state.activeIndex = state.snapshots.length - 1;
    },
    removePost(state, action: PayloadAction<number>) {
      if (state.snapshots.length <= 1) return;
      state.snapshots.splice(action.payload, 1);
      if (state.activeIndex >= state.snapshots.length) {
        state.activeIndex = state.snapshots.length - 1;
      }
    },
    setActiveIndex(state, action: PayloadAction<number>) {
      if (action.payload >= 0 && action.payload < state.snapshots.length) {
        state.activeIndex = action.payload;
      }
    },
    updateSnapshot(state, action: PayloadAction<{ index: number; snapshot: Partial<PostSnapshot> }>) {
      const { index, snapshot } = action.payload;
      if (state.snapshots[index]) {
        Object.assign(state.snapshots[index], snapshot);
      }
    },
    saveCurrentSnapshot(state, action: PayloadAction<PostSnapshot>) {
      state.snapshots[state.activeIndex] = action.payload;
    },
    setSnapshots(state, action: PayloadAction<PostSnapshot[]>) {
      state.snapshots = action.payload;
      if (state.activeIndex >= action.payload.length) {
        state.activeIndex = 0;
      }
    },
    reset(state) {
      state.snapshots = [createEmptySnapshot()];
      state.activeIndex = 0;
    },
  },
});

export const {
  addPost,
  removePost,
  setActiveIndex,
  updateSnapshot,
  saveCurrentSnapshot,
  setSnapshots,
  reset: resetSeries,
} = seriesSlice.actions;

export default seriesSlice.reducer;

export { createEmptySnapshot };
