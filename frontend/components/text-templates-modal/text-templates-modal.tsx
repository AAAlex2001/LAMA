'use client';

import { useState, useEffect } from 'react';
import styles from './text-templates-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import TrashIcon from '@/components/icons/trash-icon';
import { textTemplatesApi, TextTemplate } from '@/app/[locale]/create-post/store/text-templates-api';

interface TextTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (formattedContent: Record<string, any>) => void;
}

export default function TextTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: TextTemplatesModalProps) {
  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, searchQuery]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await textTemplatesApi.getTemplates(searchQuery || undefined);
      setTemplates(response.items);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Удалить этот шаблон?')) return;

    try {
      await textTemplatesApi.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleTemplateClick = (template: TextTemplate) => {
    onSelectTemplate(template.formatted_content);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.templatesModal} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Шаблоны текста</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <div className={styles.templatesList}>
          {isLoading ? (
            <div className={styles.emptyState}>Загрузка...</div>
          ) : templates.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? 'Шаблоны не найдены' : 'У вас пока нет шаблонов'}
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className={styles.templateItem}
                onClick={() => handleTemplateClick(template)}
              >
                <span className={styles.templateName}>{template.name}</span>
                <button
                  className={styles.deleteButton}
                  onClick={(e) => handleDelete(template.id, e)}
                >
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
