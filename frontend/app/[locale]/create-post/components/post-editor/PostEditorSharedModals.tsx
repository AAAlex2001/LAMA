'use client';

import type { RefObject } from 'react';

import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';

import DatePickerModalConnected from '../DatePickerModalConnected';
import DraftsModalConnected from '../DraftsModalConnected';
import PostPreviewModalConnected from '../PostPreviewModalConnected';
import ReplyModalConnected from '../ReplyModalConnected';
import TemplatesModalConnected from '../TemplatesModalConnected';
import SeriesScheduleModalConnected from '../SeriesScheduleModalConnected';

type Props = {
  editorRef: RefObject<RichTextEditorRef | null>;
  datePickerRedirectToDrafts?: boolean;
};

export function PostEditorSharedModals({ editorRef, datePickerRedirectToDrafts }: Props) {
  return (
    <>
      <PostPreviewModalConnected />
      <DraftsModalConnected />
      <TemplatesModalConnected editorRef={editorRef} />
      <ReplyModalConnected />
      <DatePickerModalConnected redirectToDraftsOnSuccess={datePickerRedirectToDrafts} />
      <SeriesScheduleModalConnected />
    </>
  );
}
