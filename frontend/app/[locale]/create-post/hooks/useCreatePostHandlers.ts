import type { AppDispatch } from '../store';
import * as mediaSlice from '../store/slices/media';
import * as settingsSlice from '../store/slices/settings';
import * as editorSlice from '../store/slices/editor';
import * as inlineButtonsSlice from '../store/slices/inlineButtons';
import * as quizSlice from '../store/slices/quiz';
import * as seriesSlice from '../store/slices/series';
import type { ChannelsStore } from '@/stores/channels';
import type { MediaFile, PostSnapshot, QuizMode, QuizAnswer, ButtonRow } from '../store/types';

interface UseCreatePostHandlersParams {
  dispatch: AppDispatch;
  channelsStore: ChannelsStore;
  text: string;
  mediaFiles: MediaFile[];
  inlineButtonsOpen: boolean;
  buttonRows: ButtonRow[];
  quizOpen: boolean;
  quizMode: QuizMode;
  quizQuestion: string;
  quizAnswers: QuizAnswer[];
  quizCorrectAnswerId: string | null;
  showLinkPreview: boolean;
  snapshots: PostSnapshot[];
}

export function useCreatePostHandlers({
  dispatch,
  channelsStore,
  text,
  mediaFiles,
  inlineButtonsOpen,
  buttonRows,
  quizOpen,
  quizMode,
  quizQuestion,
  quizAnswers,
  quizCorrectAnswerId,
  showLinkPreview,
  snapshots,
}: UseCreatePostHandlersParams) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: MediaFile[] = Array.from(files).map(file => {
      const type = file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('image/') ? 'image' : 'document';
      return {
        id: crypto.randomUUID(),
        type,
        file,
        preview_url: type === 'image' ? URL.createObjectURL(file) : undefined,
        size: file.size,
        blur: false,
      };
    });
    dispatch(mediaSlice.addFiles(newFiles));
    e.target.value = '';
  };

  const handleMoveMedia = (fromId: string, toId: string) => {
    dispatch(mediaSlice.moveFile({ sourceId: fromId, targetId: toId }));
  };

  const handleChannelChange = (id: string) => {
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) channelsStore.toggleChannelSelected(numericId);
  };

  const handleAddChannel = async (link: string) => {
    const success = await channelsStore.addChannel(link);
    if (success) dispatch(settingsSlice.setShowCreateChannel(false));
    return success;
  };

  const handleSelectTag = (tag: { name: string; color: string }) => {
    dispatch(settingsSlice.selectTag({ ...tag, id: 0, created_at: '' }));
  };

  const handleSelectPostSnapshot = (index: number) => {
    const currentSnapshot = {
      text,
      mediaFiles,
      inlineButtonsOpen,
      buttonRows,
      quizOpen,
      quizMode,
      quizQuestion,
      quizAnswers,
      quizCorrectAnswerId,
      showLinkPreview,
    };
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

  const handleAddSeries = () => {
    const currentSnapshot = {
      text,
      mediaFiles,
      inlineButtonsOpen,
      buttonRows,
      quizOpen,
      quizMode,
      quizQuestion,
      quizAnswers,
      quizCorrectAnswerId,
      showLinkPreview,
    };
    dispatch(seriesSlice.saveCurrentSnapshot(currentSnapshot));
    dispatch(seriesSlice.addPost());
  };

  return {
    handleFileUpload,
    handleMoveMedia,
    handleChannelChange,
    handleAddChannel,
    handleSelectTag,
    handleSelectPostSnapshot,
    handleAddSeries,
  };
}
