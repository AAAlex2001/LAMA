'use client';

import type { RefObject } from 'react';

import RichTextEditor, {
  type RichTextEditorRef,
} from '@/components/rich-text-editor/rich-text-editor.container';
import Toggle from '@/components/toggle/toggle';
import { hasPlainUrlLikeText } from '@/components/rich-text-editor/editor/link-utils';
import { useNotifications } from '@/components/notifications/NotificationProvider';

import ActionsMenuConnected from '../ActionsMenuConnected';
import InlineButtonsConnected from '../InlineButtonsConnected';
import MediaSectionConnected from '../MediaSectionConnected';
import QuizFormConnected from '../QuizFormConnected';
import ReplyToPostInfoConnected from '../ReplyToPostInfoConnected';

import { useAppDispatch, useAppSelector } from '../../store';
import * as editorSlice from '../../store/slices/editor';
import * as mediaSlice from '../../store/slices/media';
import { saveAsTemplate } from '../../store/thunks';
import { mediaFilesFromInput } from '../../utils/mediaFilesFromInput';

export type PostEditorMainFieldsClassNames = {
  content: string;
  linkPreviewToggle: string;
  linkPreviewLabel: string;
  actionsMenu: string;
  actionsRow: string;
  actionsRowCenter: string;
  actionButton: string;
  actionButtonCenter: string;
  inlineButtonsSection: string;
  mediaSection: string;
  mediaSectionTitle: string;
  mediaMobile: string;
  mediaDropzone: string;
  dropzoneText: string;
  mediaDropzoneContent: string;
};

type Props = {
  styles: PostEditorMainFieldsClassNames;
  headerRef: RefObject<HTMLDivElement | null>;
  editorRef: RefObject<RichTextEditorRef | null>;
};

export function PostEditorMainFields({ styles, headerRef, editorRef }: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const text = useAppSelector((state) => state.editor.text);
  const showLinkPreview = useAppSelector((state) => state.editor.showLinkPreview);
  const mediaFiles = useAppSelector((state) => state.media.files);
  const editorMaxLength = mediaFiles.length > 0 ? 1024 : 4096;

  return (
    <div className={styles.content}>
      <RichTextEditor
        ref={editorRef}
        value={text}
        onChange={(v) => dispatch(editorSlice.setText(v))}
        placeholder="Напишите текст публикации..."
        maxLength={editorMaxLength}
        onSaveAsTemplate={(html) => {
          dispatch(saveAsTemplate(html)).then((result) => {
            if (result.meta.requestStatus === 'fulfilled') {
              showSuccess('Шаблон успешно сохранён');
            } else if (result.meta.requestStatus === 'rejected') {
              showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения шаблона');
            }
          });
        }}
        headerRef={headerRef}
      />

      {text && hasPlainUrlLikeText(text) && (
        <div className={styles.linkPreviewToggle}>
          <span className={styles.linkPreviewLabel}>Показать превью ссылки</span>
          <Toggle checked={showLinkPreview} onChange={(v) => dispatch(editorSlice.setShowLinkPreview(v))} />
        </div>
      )}

      <ActionsMenuConnected
        className={styles.actionsMenu}
        actionsRowClassName={styles.actionsRow}
        actionsRowCenterClassName={styles.actionsRowCenter}
        actionButtonClassName={styles.actionButton}
        actionButtonCenterClassName={styles.actionButtonCenter}
      />

      <ReplyToPostInfoConnected />

      <InlineButtonsConnected className={styles.inlineButtonsSection} />

      <QuizFormConnected />

      <MediaSectionConnected
        className={styles.mediaSection}
        titleClassName={styles.mediaSectionTitle}
        mobilClassName={styles.mediaMobile}
        dropzoneClassName={styles.mediaDropzone}
        dropzoneTextClassName={styles.dropzoneText}
        dropzoneContentClassName={styles.mediaDropzoneContent}
        onFileUpload={async (e) => {
          const files = e.target.files;
          if (!files) return;
          const newFiles = await mediaFilesFromInput(files);
          dispatch(mediaSlice.addFiles(newFiles));
          e.target.value = '';
        }}
        onMoveMedia={(fromId, toId) => dispatch(mediaSlice.moveFile({ sourceId: fromId, targetId: toId }))}
      />
    </div>
  );
}
