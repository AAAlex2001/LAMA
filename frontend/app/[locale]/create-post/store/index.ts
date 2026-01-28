import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import editorReducer from './slices/editor';
import mediaReducer from './slices/media';
import inlineButtonsReducer from './slices/inlineButtons';
import quizReducer from './slices/quiz';
import settingsReducer from './slices/settings';
import uiReducer from './slices/ui';
import seriesReducer from './slices/series';
import draftsReducer from './slices/drafts';
import templatesReducer from './slices/templates';
import replyToPostReducer from './slices/replyToPost';
import datePickerReducer from './slices/datePicker';

export const createPostStore = configureStore({
  reducer: {
    editor: editorReducer,
    media: mediaReducer,
    inlineButtons: inlineButtonsReducer,
    quiz: quizReducer,
    settings: settingsReducer,
    ui: uiReducer,
    series: seriesReducer,
    drafts: draftsReducer,
    templates: templatesReducer,
    replyToPost: replyToPostReducer,
    datePicker: datePickerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['media/addFiles', 'media/setFiles', 'datePicker/setSelectedDate'],
        ignoredPaths: ['media.files', 'datePicker.selectedDate'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof createPostStore.getState>;
export type AppDispatch = typeof createPostStore.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export { createPostStore as store };
