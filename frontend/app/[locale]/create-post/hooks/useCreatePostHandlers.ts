import type { AppDispatch } from '../store';
import * as editorSlice from '../store/slices/editor';
import * as mediaSlice from '../store/slices/media';
import * as inlineButtonsSlice from '../store/slices/inlineButtons';
import * as quizSlice from '../store/slices/quiz';
import * as seriesSlice from '../store/slices/series';
import type { PostSnapshot } from '../store/types';

interface UseCreatePostHandlersParams {
  dispatch: AppDispatch;
  snapshots: PostSnapshot[];
}

export function useCreatePostHandlers({
  dispatch,
  snapshots,
}: UseCreatePostHandlersParams) {
  const handleSelectPostSnapshot = (index: number, currentSnapshot: any) => {
    dispatch(seriesSlice.saveCurrentSnapshot(currentSnapshot));
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
    }
  };

  const handleAddSeries = (currentSnapshot: any) => {
    dispatch(seriesSlice.saveCurrentSnapshot(currentSnapshot));
    dispatch(seriesSlice.addPost());
  };

  return {
    handleSelectPostSnapshot,
    handleAddSeries,
  };
}
