import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { resetEditor } from '../slices/editor';
import { clearFiles } from '../slices/media';
import { resetInlineButtons } from '../slices/inlineButtons';
import { resetQuiz } from '../slices/quiz';
import { resetSettings } from '../slices/settings';
import { resetSeries } from '../slices/series';
import { resetUi } from '../slices/ui';

export function resetAll(): ThunkAction<void, RootState, undefined, UnknownAction> {
  return (dispatch) => {
    dispatch(resetEditor());
    dispatch(clearFiles());
    dispatch(resetInlineButtons());
    dispatch(resetQuiz());
    dispatch(resetSettings());
    dispatch(resetSeries());
    dispatch(resetUi());
  };
}
