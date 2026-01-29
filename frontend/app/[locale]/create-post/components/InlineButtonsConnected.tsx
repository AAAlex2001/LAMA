'use client';

import InlineButtons from '@/components/inline-buttons/inline-buttons';
import { useAppDispatch, useAppSelector } from '../store';
import * as inlineButtonsSlice from '../store/slices/inlineButtons';

interface InlineButtonsConnectedProps {
  className?: string;
}

export default function InlineButtonsConnected({ className }: InlineButtonsConnectedProps) {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector(state => state.inlineButtons.isOpen);
  const rows = useAppSelector(state => state.inlineButtons.rows);

  return (
    <InlineButtons
      className={className}
      isOpen={isOpen}
      rows={rows}
      onAddRow={() => dispatch(inlineButtonsSlice.addRow())}
      onAddColumn={(rowId) => dispatch(inlineButtonsSlice.addColumn(rowId))}
      onUpdateButton={(rowId, buttonId, updates) => dispatch(inlineButtonsSlice.updateButton({ rowId, buttonId, updates }))}
      onDeleteButton={(rowId, buttonId) => dispatch(inlineButtonsSlice.deleteButton({ rowId, buttonId }))}
    />
  );
}
