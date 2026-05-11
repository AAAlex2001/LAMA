'use client';

import { useEffect, useState } from 'react';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useTextTemplatesQuery,
  useUpdateTextTemplateMutation,
  useDeleteTextTemplateMutation,
} from '@/store/text-templates/queries';
import { useAppDispatch, useAppSelector } from '../store';
import { setShowTemplatesModal } from '../store/slices/ui';
import type { TextTemplate } from '../store/types';
import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';

interface Props {
  editorRef: React.RefObject<RichTextEditorRef | null>;
}

export default function TemplatesModalConnected({ editorRef }: Props) {
  const dispatch = useAppDispatch();
  const { showSuccess } = useNotifications();
  const isOpen = useAppSelector((s) => s.ui.showTemplatesModal);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const templates = useTextTemplatesQuery(debouncedSearch);
  const updateMutation = useUpdateTextTemplateMutation();
  const deleteMutation = useDeleteTextTemplateMutation();

  const items = templates.data?.pages.flatMap((p) => p.items) ?? [];
  const close = () => dispatch(setShowTemplatesModal(false));

  return (
    <TextTemplatesModal
      isOpen={isOpen}
      templates={items}
      isLoading={templates.isLoading}
      isLoadingMore={templates.isFetchingNextPage}
      hasMore={templates.hasNextPage ?? false}
      searchQuery={search}
      selectedTemplateId={null}
      onSearchQueryChange={setSearch}
      onLoadMore={() => templates.fetchNextPage()}
      onUpdate={(id, changes) => updateMutation.mutate({ id, changes })}
      onDelete={(id) => deleteMutation.mutateAsync(id).then(() => showSuccess('Шаблон удалён'))}
      onSelect={(template: TextTemplate) => {
        const raw = template.formatted_content?.html || template.formatted_content?.text || '';
        const html = raw.replace(/^<p>|<\/p>$/g, '');
        editorRef.current?.insertHtml(html);
        close();
      }}
      onClose={close}
    />
  );
}
