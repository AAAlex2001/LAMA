import type { AppDispatch } from '../store';
import * as editorSlice from '../store/slices/editor';
import * as mediaSlice from '../store/slices/media';
import * as inlineButtonsSlice from '../store/slices/inlineButtons';
import * as quizSlice from '../store/slices/quiz';
import * as seriesSlice from '../store/slices/series';
import * as settingsSlice from '../store/slices/settings';
import type { PostSnapshot } from '../store/types';
import type { TagColor } from '@/types';

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
  const toSerializableSnapshot = (snapshot: PostSnapshot): PostSnapshot => ({
    ...snapshot,
    // File objects are not serializable and trigger RTK middleware warnings.
    mediaFiles: snapshot.mediaFiles.map(({ file: _file, ...rest }) => rest),
  });
  const buildSnapshotForSave = (snapshot: PostSnapshot): PostSnapshot => {
    const base = snapshots[activeIndex];
    return toSerializableSnapshot({
      ...snapshot,
      sourcePublicationId: snapshot.sourcePublicationId ?? base?.sourcePublicationId,
      seriesId: snapshot.seriesId ?? base?.seriesId,
      seriesOrder: snapshot.seriesOrder ?? base?.seriesOrder,
    });
  };

  const handleSelectPostSnapshot = (index: number, currentSnapshot: any) => {
    dispatch(seriesSlice.saveCurrentSnapshot(buildSnapshotForSave(currentSnapshot)));
    dispatch(seriesSlice.setActiveIndex(index));
    const snapshot = snapshots[index];
    if (snapshot) {
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
      if (snapshot.selectedTags !== undefined) {
        dispatch(settingsSlice.clearTags());
        for (const tag of snapshot.selectedTags) {
          dispatch(settingsSlice.addTag({ name: tag.name, color: tag.color as TagColor }));
        }
      }
    }
  };

  const handleAddSeries = (currentSnapshot: any) => {
    dispatch(seriesSlice.saveCurrentSnapshot(buildSnapshotForSave(currentSnapshot)));
    dispatch(seriesSlice.addPost());

    dispatch(editorSlice.setText(''));
    dispatch(mediaSlice.setFiles([]));
    dispatch(inlineButtonsSlice.closeInlineButtons());
    dispatch(quizSlice.closeQuiz());
    dispatch(editorSlice.setShowLinkPreview(false));
  };

  const handleRemovePost = (indexToRemove: number, currentSnapshot: PostSnapshot) => {
    if (snapshots.length <= 1) return;

    // Save current editor state into the active snapshot first
    dispatch(seriesSlice.saveCurrentSnapshot(buildSnapshotForSave(currentSnapshot)));

    // Remove the post
    dispatch(seriesSlice.removePost(indexToRemove));

    // Determine which snapshot will become active after removal
    const remaining = snapshots.filter((_, i) => i !== indexToRemove);
    const newActiveIndex = indexToRemove >= remaining.length ? remaining.length - 1 : indexToRemove;
    const newSnapshot = remaining[newActiveIndex];

    if (newSnapshot) {
      dispatch(editorSlice.setText(newSnapshot.text));
      dispatch(mediaSlice.setFiles(newSnapshot.mediaFiles));
      dispatch(inlineButtonsSlice.setRows(newSnapshot.buttonRows));
      if (newSnapshot.quizOpen) {
        dispatch(quizSlice.openQuiz());
      } else {
        dispatch(quizSlice.closeQuiz());
      }
      dispatch(quizSlice.setMode(newSnapshot.quizMode));
      dispatch(quizSlice.setQuestion(newSnapshot.quizQuestion));
      dispatch(quizSlice.setAnswers(newSnapshot.quizAnswers));
      dispatch(editorSlice.setShowLinkPreview(newSnapshot.showLinkPreview));
    }
  };

  return {
    handleSelectPostSnapshot,
    handleAddSeries,
    handleRemovePost,
  };
}
