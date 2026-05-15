'use client';

import { useState } from 'react';
import styles from './text-templates-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import Input from '@/components/input';
import { CheckIcon, CloseIcon, EditNameIcon, TrashIcon } from '@/components/icons';
import Loader from '@/components/loader';
import Checkbox from '@/components/checkbox/checkbox';
import DeleteConfirmationModal from '@/components/modal';
import type { TemplatesModalProps, TextTemplate } from '@/types/post';

export default function TextTemplatesModal({
  isOpen,
  templates,
  isLoading,
  isLoadingMore,
  hasMore,
  searchQuery,
  selectedTemplateId,
  onSearchQueryChange,
  onLoadMore,
  onUpdate,
  onDelete,
  onSelect,
  onClose,
}: TemplatesModalProps) {
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<number | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    if (scrolledToBottom && hasMore && !isLoadingMore && !searchQuery) {
      onLoadMore();
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmationId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmationId !== null) {
      await onDelete(deleteConfirmationId);
      setDeleteConfirmationId(null);
    }
  };

  const startEdit = (template: TextTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplateId(template.id);
    setEditingName(template.name || '');
  };

  const cancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTemplateId(null);
    setEditingName('');
  };

  const saveEdit = async (template: TextTemplate) => {
    const nextName = editingName.trim();
    if (!nextName) {
      setEditingName(template.name || '');
      setEditingTemplateId(null);
      return;
    }
    if (nextName !== template.name) {
      await onUpdate(template.id, { name: nextName });
    }
    setEditingTemplateId(null);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.templatesModal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder="Введите текст"
            value={searchQuery}
            onChange={onSearchQueryChange}
          />
        </div>

        <h2 className={styles.modalTitle}>Шаблоны текста</h2>

        <div className={styles.templatesList}>
          <div className={styles.listScroll} onScroll={handleScroll}>
            {isLoading ? (
              <div className={styles.emptyState}>
                <Loader size={24} color="blue" />
              </div>
            ) : templates.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery ? 'Шаблоны не найдены' : 'У вас еще нет шаблонов'}
              </div>
            ) : (
              <>
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={styles.templateItem}
                    onClick={() => onSelect(template)}
                  >
                  {editingTemplateId === template.id ? (
                    <div className={styles.templateNameEditor} onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editingName}
                        onChange={setEditingName}
                        autoFocus
                        className={styles.templateNameInput}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveEdit(template);
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        icons={[
                          {
                            icon: <CheckIcon width={14} height={14} color="#2F67C3" />,
                            onClick: () => saveEdit(template),
                          },
                          {
                            icon: <CloseIcon width={14} height={14} color="#9CA3AF" />,
                            onClick: () => cancelEdit(),
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <span className={styles.templateName}>{template.name}</span>
                  )}
                  <button
                    className={styles.editButton}
                    onClick={(e) => startEdit(template, e)}
                    aria-label="Редактировать название"
                  >
                    <EditNameIcon
                      width={20}
                      height={20}
                      color="#000000"
                    />
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => handleDelete(template.id, e)}
                  >
                    <TrashIcon
                      width={16}
                      height={16}
                      color="#B0B4B8"
                    />
                  </button>
                </div>
              ))}
              
                {isLoadingMore && (
                  <div className={styles.loadingMore}>
                    <Loader size={20} color="blue" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteConfirmationId !== null}
        onClose={() => setDeleteConfirmationId(null)}
        onConfirm={confirmDelete}
        title="Удаление шаблона"
        confirmVariant="outlined-red"
      />
    </div>
  );
}
