'use client';

import { useState, useEffect } from 'react';
import styles from './text-templates-modal.module.scss';
import SearchBar from '@/components/search-bar/search-bar';
import TrashIcon from '@/components/icons/trash-icon';
import Loader from '@/components/loader';
import Checkbox from '@/components/checkbox/checkbox';
import { templatesApi, type TextTemplate } from '@/stores/templates';

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [hoveredDeleteId, setHoveredDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, searchQuery]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await templatesApi.getTemplates(searchQuery || undefined);
      setTemplates(response.items);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();

    // Сразу удаляем из UI
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
    }

    // Затем отправляем запрос на сервер
    try {
      await templatesApi.deleteTemplate(id);
    } catch (error) {
      console.error('Failed to delete template:', error);
      // В случае ошибки можно перезагрузить список
      loadTemplates();
    }
  };

  const handleTemplateClick = (template: TextTemplate) => {
    setSelectedTemplateId(template.id);
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
        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder="Введите текст"
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <h2 className={styles.modalTitle}>Шаблоны текста</h2>

        <div className={styles.templatesList}>
          {isLoading ? (
            <div className={styles.emptyState}>
              <Loader size={24} color="blue" />
            </div>
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
                <Checkbox
                  variant="radio"
                  checked={selectedTemplateId === template.id}
                  onChange={() => handleTemplateClick(template)}
                />
                <span className={styles.templateName}>{template.name}</span>
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
                    <div className={styles.deleteTooltip}>удалить шаблон?</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
