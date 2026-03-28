'use client';

import { useEffect } from 'react';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import { useAppDispatch, useAppSelector } from '../store';
import * as templatesSlice from '../store/slices/templates';
import * as editorSlice from '../store/slices/editor';
import * as uiSlice from '../store/slices/ui';
import { fetchMoreTemplates, updateTemplateThunk, deleteTemplateThunk, searchTemplates, fetchTemplates } from '../store/thunks';
import type { TextTemplate } from '../store/types';
import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';
import { useNotifications } from '@/components/notifications/NotificationProvider';

interface TemplatesModalConnectedProps {
  editorRef: React.RefObject<RichTextEditorRef | null>;
}

export default function TemplatesModalConnected({ editorRef }: TemplatesModalConnectedProps) {
  const dispatch = useAppDispatch();
  const { showSuccess } = useNotifications();

  const isOpen = useAppSelector(state => state.ui.showTemplatesModal);
  const templatesState = useAppSelector(state => state.templates);

  useEffect(() => {
    if (!isOpen) return;

    if (templatesState.searchQuery) {
      const timeoutId = setTimeout(() => {
        dispatch(searchTemplates(templatesState.searchQuery));
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      dispatch(fetchTemplates());
    }
  }, [templatesState.searchQuery, isOpen, dispatch]);

  return (
    <TextTemplatesModal
      isOpen={isOpen}
      templates={templatesState.items}
      isLoading={templatesState.isLoading}
      isLoadingMore={templatesState.isLoadingMore}
      hasMore={templatesState.hasMore}
      searchQuery={templatesState.searchQuery}
      selectedTemplateId={templatesState.selectedTemplateId}
      onSearchQueryChange={(q) => dispatch(templatesSlice.setSearchQuery(q))}
      onLoadMore={() => dispatch(fetchMoreTemplates())}
      onUpdate={(id, changes) => dispatch(updateTemplateThunk({ id, changes }))}
      onDelete={(id) => dispatch(deleteTemplateThunk(id)).then(() => showSuccess('Шаблон удалён'))}
      onSelect={(template: TextTemplate) => {
        let html = template.formatted_content?.html || template.formatted_content?.text || '';
        html = html.replace(/^<p>|<\/p>$/g, '');
        editorRef.current?.insertHtml(html);
        dispatch(uiSlice.setShowTemplatesModal(false));
      }}
      onClose={() => dispatch(uiSlice.setShowTemplatesModal(false))}
    />
  );
}
