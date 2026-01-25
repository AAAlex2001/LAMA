'use client';

import { useState } from 'react';
import styles from './text-templates-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import TrashIcon from '@/components/icons/trash-icon';
import Input from '@/components/input';
import { EditNameIcon, CheckIcon, CloseIcon } from '@/components/icons';
import Loader from '@/components/loader';
import Checkbox from '@/components/checkbox/checkbox';
import { useTemplates } from './TemplatesContext';

interface TextTemplatesModalProps {
  onSelectTemplate: (formattedContent: Record<string, any>) => void;
}

export default function TextTemplatesModal({ onSelectTemplate }: TextTemplatesModalProps) {
  const {
    templates,
    isOpen,
    isLoading,
    isLoadingMore,
    hasMore,
    searchQuery,
    selectedTemplateId,
    setSearchQuery,
    updateTemplate,
    deleteTemplate,
    selectTemplate,
    loadMoreTemplates,
    close,
  } = useTemplates();

  const [hoveredDeleteId, setHoveredDeleteId] = useState<number | null>(null);
  const [hoveredEditId, setHoveredEditId] = useState<number | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    
    if (scrolledToBottom && hasMore && !isLoadingMore && !searchQuery) {
      loadMoreTemplates();
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTemplate(id);
  };

  const startEdit = (template: { id: number; name: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplateId(template.id);
    setEditingName(template.name || '');
  };

  const cancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTemplateId(null);
    setEditingName('');
  };

  const saveEdit = async (template: { id: number; name: string }) => {
    const nextName = editingName.trim();
    if (!nextName) {
      setEditingName(template.name || '');
      setEditingTemplateId(null);
      return;
    }
    if (nextName !== template.name) {
      await updateTemplate(template.id, { name: nextName });
    }
    setEditingTemplateId(null);
  };

  const handleTemplateClick = (template: { id: number; formatted_content: Record<string, any> }) => {
    selectTemplate(template.id);
    onSelectTemplate(template.formatted_content);
    close();
  };

  const handleClose = () => {
    close();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.templatesModal} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder="Введите текст"
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <h2 className={styles.modalTitle}>Шаблоны текста</h2>

        <div className={styles.templatesList} onScroll={handleScroll}>
          {isLoading || (templates.length === 0 && !searchQuery) ? (
            <div className={styles.emptyState}>
              <Loader size={24} color="blue" />
            </div>
          ) : templates.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? 'Шаблоны не найдены' : 'У вас пока нет шаблонов'}
            </div>
          ) : (
            <>
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={styles.templateItem}
                  onClick={() => handleTemplateClick(template)}
                >
                  <Checkbox
                    variant="radio"
                    checked={selectedTemplateId === template.id}
                    onChange={() => handleTemplateClick(template)}
                  />
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
                  <div className={styles.editButtonWrapper}>
                    <button
                      className={styles.editButton}
                      onClick={(e) => startEdit(template, e)}
                      onMouseEnter={() => setHoveredEditId(template.id)}
                      onMouseLeave={() => setHoveredEditId(null)}
                      aria-label="Редактировать название"
                    >
                      <EditNameIcon
                        width={20}
                        height={20}
                        color={hoveredEditId === template.id ? '#2F67C3' : '#383F45'}
                      />
                    </button>
                    {hoveredEditId === template.id && (
                      <div className={styles.editTooltip}>редактировать название</div>
                    )}
                  </div>
                  <div className={styles.deleteButtonWrapper}>
                    <button
                      className={styles.deleteButton}
                      onClick={(e) => handleDelete(template.id, e)}
                      onMouseEnter={() => setHoveredDeleteId(template.id)}
                      onMouseLeave={() => setHoveredDeleteId(null)}
                    >
                      <TrashIcon 
                        width={16} 
                        height={16} 
                        color={hoveredDeleteId === template.id ? '#EF4444' : '#B0B4B8'} 
                      />
                    </button>
                    {hoveredDeleteId === template.id && (
                      <div className={styles.deleteTooltip}>удалить?</div>
                    )}
                  </div>
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
  );
}
