'use client';

import { useState } from 'react';
import classNames from 'classnames';
import styles from './tags.module.scss';
import Input from '@/components/input';
import SearchBar from '@/components/search-bar/search-bar';
import Loader from '@/components/loader';
import TagCloseIcon from '@/components/icons/tag-close-icon';
import type { TagsContentProps, ApiTag } from '../../types';
import { TAG_COLORS } from '../../types';

export default function TagsContent({
  recentTags,
  searchResults,
  tagInputValue,
  selectedTagName,
  tagsLoading,
  selectedTagColor,
  onTagInputChange,
  onSelectTag,
  onSearchTags,
  onDeleteTag,
  onTagColorChange,
}: TagsContentProps) {
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const handleTagSearch = (query: string) => {
    setTagSearchQuery(query);
    onSearchTags?.(query);
  };

  const handleSelectTag = (tag: ApiTag) => {
    onTagInputChange?.(tag.name);
    onSelectTag?.(tag);
    setTagSearchQuery('');
  };

  return (
    <>
      {/* Инпут для ввода названия тега */}
      <div className={styles.tagInputWrapper}>
        <Input
          placeholder="Введите название тега"
          value={tagInputValue}
          onChange={(value) => onTagInputChange?.(value)}
        />
      </div>

      {/* Выбор цвета тега */}
      <div className={styles.colorPickerSection}>
        <span className={styles.colorPickerLabel}>Выберите цвет тега</span>
        <div className={styles.colorButtons}>
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={classNames(styles.colorButton, {
                [styles.colorButtonSelected]: selectedTagColor === color,
              })}
              style={{ backgroundColor: color }}
              onClick={() => onTagColorChange?.(color)}
            />
          ))}
        </div>
      </div>

      {/* Недавние теги */}
      {recentTags.length > 0 && (
        <>
          <span className={styles.recentTagsLabel}>Недавние теги</span>
          <div className={styles.tagsPreview}>
            {recentTags.slice(0, 6).map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={classNames(styles.tagPreviewItem, {
                  [styles.tagSelected]: selectedTagName === tag.name,
                })}
                style={{ backgroundColor: tag.color || '#FAC7C7' }}
                onClick={() => handleSelectTag(tag)}
              >
                <span className={styles.tagText} title={tag.name}>
                  {tag.name}
                </span>
                {onDeleteTag && (
                  <span
                    className={styles.tagDeleteIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTag(tag.id);
                    }}
                  >
                    <TagCloseIcon width={12} height={12} color="#383F45" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Лоадер при загрузке тегов */}
      {tagsLoading && (
        <div className={styles.loadingContainer}>
          <Loader size={24} color="blue" />
        </div>
      )}

      {/* Поиск по тегам */}
      <SearchBar
        placeholder="Поиск по тегам"
        value={tagSearchQuery}
        onChange={handleTagSearch}
      />

      {/* Результаты поиска */}
      {tagSearchQuery && searchResults.length > 0 && (
        <div className={styles.searchResults}>
          {searchResults.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={styles.searchResultItem}
              onClick={() => handleSelectTag(tag)}
            >
              <span className={styles.tagText} title={tag.name}>
                {tag.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
