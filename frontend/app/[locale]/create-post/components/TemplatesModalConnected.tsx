'use client';

import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import { useAppDispatch, useAppSelector } from '../store';
import * as templatesSlice from '../store/slices/templates';
import * as editorSlice from '../store/slices/editor';
import * as uiSlice from '../store/slices/ui';
import { fetchMoreTemplates, updateTemplateThunk, deleteTemplateThunk } from '../store/thunks';
import type { TextTemplate } from '../store/types';

export default function TemplatesModalConnected() {
  const dispatch = useAppDispatch();

  const isOpen = useAppSelector(state => state.ui.showTemplatesModal);
  const templatesState = useAppSelector(state => state.templates);

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
      onDelete={(id) => dispatch(deleteTemplateThunk(id))}
      onSelect={(template: TextTemplate) => {
        dispatch(editorSlice.setText(template.formatted_content?.text || ''));
        dispatch(uiSlice.setShowTemplatesModal(false));
      }}
      onClose={() => dispatch(uiSlice.setShowTemplatesModal(false))}
    />
  );
}
