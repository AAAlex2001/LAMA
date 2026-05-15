import type { AppDispatch, RootState } from '../store';
import { useStore } from 'react-redux';
import * as editorSlice from '../store/slices/editor';
import * as mediaSlice from '../store/slices/media';
import * as inlineButtonsSlice from '../store/slices/inlineButtons';
import * as quizSlice from '../store/slices/quiz';
import * as seriesSlice from '../store/slices/series';
import { applySnapshotSettings, captureSnapshotSettings } from '../store/snapshotSettings';
import type { PostSnapshot } from '../store/types';

interface UseCreatePostHandlersParams {
  dispatch: AppDispatch;
  snapshots: PostSnapshot[];
  activeIndex?: number;
}

export function useCreatePostHandlers({
  dispatch,
  snapshots,
  activeIndex = 0,
}: UseCreatePostHandlersParams) {
  const store = useStore<RootState>();

  const toSerializableSnapshot = (snapshot: PostSnapshot): PostSnapshot => ({
    ...snapshot,
    mediaFiles: snapshot.mediaFiles.map(({ file: _file, ...rest }) => rest),
  });

  const buildSnapshotForSave = (snapshot: PostSnapshot): PostSnapshot => {
    const base = snapshots[activeIndex];
    return toSerializableSnapshot({
      ...snapshot,
      sourcePublicationId: snapshot.sourcePublicationId ?? base?.sourcePublicationId,
      seriesId: snapshot.seriesId ?? base?.seriesId,
      seriesOrder: snapshot.seriesOrder ?? base?.seriesOrder,
      settings: captureSnapshotSettings(store.getState()),
    });
  };

  const loadSnapshotIntoEditor = (snapshot: PostSnapshot) => {
    dispatch(editorSlice.setText(snapshot.text));
    dispatch(mediaSlice.setFiles(snapshot.mediaFiles));
    dispatch(inlineButtonsSlice.setRows(snapshot.buttonRows));
    if (snapshot.quizOpen) {
      dispatch(quizSlice.openQuiz());
    } else {
      dispatch(quizSlice.closeQuiz());
    }
    dispatch(quizSlice.setMode(snapshot.quizMode));
    dispatch(quizSlice.setQuestion(snapshot.quizQuestion));
    dispatch(quizSlice.setAnswers(snapshot.quizAnswers));
    dispatch(editorSlice.setShowLinkPreview(snapshot.showLinkPreview));

    if (snapshot.settings) {
      applySnapshotSettings(dispatch, snapshot.settings);
    }
  };

  const handleSelectPostSnapshot = (index: number, currentSnapshot: PostSnapshot) => {
    dispatch(seriesSlice.saveCurrentSnapshot(buildSnapshotForSave(currentSnapshot)));
    dispatch(seriesSlice.setActiveIndex(index));
    const target = snapshots[index];
    if (target) {
      loadSnapshotIntoEditor(target);
    }
  };

  const handleAddSeries = (currentSnapshot: PostSnapshot) => {
    dispatch(seriesSlice.saveCurrentSnapshot(buildSnapshotForSave(currentSnapshot)));
    dispatch(seriesSlice.addPost(captureSnapshotSettings(store.getState())));

    dispatch(editorSlice.setText(''));
    dispatch(mediaSlice.setFiles([]));
    dispatch(inlineButtonsSlice.closeInlineButtons());
    dispatch(quizSlice.closeQuiz());
    dispatch(editorSlice.setShowLinkPreview(false));
  };

  const handleRemovePost = (indexToRemove: number, currentSnapshot: PostSnapshot) => {
    if (snapshots.length <= 1) return;

    dispatch(seriesSlice.saveCurrentSnapshot(buildSnapshotForSave(currentSnapshot)));
    dispatch(seriesSlice.removePost(indexToRemove));

    const remaining = snapshots.filter((_, i) => i !== indexToRemove);
    const newActiveIndex = indexToRemove >= remaining.length ? remaining.length - 1 : indexToRemove;
    const newSnapshot = remaining[newActiveIndex];
    if (newSnapshot) {
      loadSnapshotIntoEditor(newSnapshot);
    }
  };

  return {
    handleSelectPostSnapshot,
    handleAddSeries,
    handleRemovePost,
  };
}
