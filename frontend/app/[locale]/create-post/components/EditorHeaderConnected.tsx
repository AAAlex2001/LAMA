'use client';

import { useState, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { SettingsIcon } from '@/components/icons';
import TagCloseIcon from '@/components/icons/tag-close-icon';
import PlusIcon from '@/components/icons/plus-icon';
import TrashIcon from '@/components/icons/trash-icon';
import SearchBar from '@/components/search-bar/search-bar';
import DeleteConfirmationModal from '@/components/modal/modal';
import Loader from '@/components/loader';
import Button from '@/components/button/button';
import { TAG_COLORS } from '@/types';
import type { TagColor } from '@/types';
import { useAppDispatch, useAppSelector } from '../store';
import { selectTagsState } from '../store/selectors';
import * as settingsSlice from '../store/slices/settings';
import * as uiSlice from '../store/slices/ui';
import { fetchTagsThunk, searchTagsThunk, createTagThunk, deleteTagThunk, updateTagThunk } from '../store/thunks';
import { clearSearch } from '../store/slices/tags';
import styles from '../create-post.module.scss';
import tagStyles from '../tags.module.scss';

interface EditorHeaderConnectedProps {
  className?: string;
  headerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function EditorHeaderConnected({
  className,
  headerRef,
}: EditorHeaderConnectedProps) {
  const dispatch = useAppDispatch();

  const selectedTags = useAppSelector(state => state.settings.selectedTags);
  const selectedTagColor = useAppSelector(state => state.settings.selectedTagColor);
  const tagInputValue = useAppSelector(state => state.settings.tagInputValue);
  const showTagsPanel = useAppSelector(state => state.ui.showTagsPanel);
  const showMobileSettings = useAppSelector(state => state.ui.showMobileSettings);

  const tagsState = useAppSelector(selectTagsState);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [editingTag, setEditingTag] = useState<{ id: number; name: string; color: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<TagColor>('#FAC7C7');

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    if (showTagsPanel) {
      dispatch(fetchTagsThunk({}));
    }
  }, [showTagsPanel, dispatch]);

  const handleTogglePanel = () => {
    dispatch(uiSlice.setShowTagsPanel(!showTagsPanel));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      dispatch(searchTagsThunk(query));
    } else {
      dispatch(clearSearch());
    }
  };

  const handleSearchFocus = () => {
    setShowDropdown(true);
    dispatch(fetchTagsThunk({}));
  };

  const handleDropdownScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    if (scrolledToBottom && tagsState.hasMore && !tagsState.loadingMore && !searchQuery) {
      dispatch(fetchTagsThunk({ append: true }));
    }
  }, [dispatch, tagsState.hasMore, tagsState.loadingMore, searchQuery]);

  const handleSelectSearchTag = (tag: { id: number; name: string; color?: string }) => {
    const tagColor = (tag.color && TAG_COLORS.includes(tag.color as TagColor))
      ? (tag.color as TagColor)
      : '#B8DBF1';
    dispatch(settingsSlice.addTag({
      id: tag.id,
      name: tag.name,
      color: tagColor,
    }));
    setSearchQuery('');
    dispatch(clearSearch());
    setShowDropdown(false);
  };

  const handleStartEditTag = (tag: { id: number; name: string; color?: string }) => {
    const tagColor = (tag.color && TAG_COLORS.includes(tag.color as TagColor))
      ? (tag.color as TagColor)
      : '#FAC7C7';
    setEditingTag({ id: tag.id, name: tag.name, color: tagColor });
    setEditName(tag.name);
    setEditColor(tagColor);
    if (!showTagsPanel) {
      dispatch(uiSlice.setShowTagsPanel(true));
    }
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setEditName('');
    setEditColor('#FAC7C7');
  };

  const handleSaveEdit = async () => {
    if (!editingTag) return;
    const newName = editName.trim() || editingTag.name;
    const newColor = editColor;
    const result = await dispatch(updateTagThunk({
      id: editingTag.id,
      name: newName,
      color: newColor,
    }));
    if (updateTagThunk.fulfilled.match(result)) {
      dispatch(settingsSlice.updateSelectedTag({
        id: editingTag.id,
        name: newName,
        color: newColor,
      }));
    }
    setEditingTag(null);
  };

  const handleRequestDelete = (tagId: number) => {
    setDeleteConfirmId(tagId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId !== null) {
      dispatch(deleteTagThunk(deleteConfirmId));
      const tagToDelete = [...tagsState.recentTags, ...tagsState.searchResults].find(t => t.id === deleteConfirmId);
      if (tagToDelete) {
        dispatch(settingsSlice.removeSelectedTag(tagToDelete.name));
      }
      if (editingTag && editingTag.id === deleteConfirmId) {
        handleCancelEdit();
      }
      setDeleteConfirmId(null);
    }
  };

  const handleAddNewTag = async () => {
    if (tagInputValue.trim()) {
      const name = tagInputValue.trim();
      const color = selectedTagColor;
      dispatch(settingsSlice.addTag({ name, color }));
      dispatch(settingsSlice.setTagInputValue(''));
      const result = await dispatch(createTagThunk({ name, color }));
      if (createTagThunk.fulfilled.match(result) && result.payload) {
        dispatch(settingsSlice.updateSelectedTagId({ name, id: (result.payload as { id: number }).id }));
      }
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddNewTag();
    }
  };

  const handleRemoveTag = (name: string) => {
    dispatch(settingsSlice.removeSelectedTag(name));
  };

  const handleSelectedTagClick = (tag: { id?: number; name: string; color: TagColor }) => {
    if (tag.id) {
      handleStartEditTag({ id: tag.id, name: tag.name, color: tag.color });
    }
  };

  const displayResults = searchQuery.trim() ? tagsState.searchResults : tagsState.recentTags;

  return (
    <>
      <div className={className} ref={headerRef}>
        <div className={styles.headerTagsRow}>
          <button
            type="button"
            className={styles.addTagButton}
            onClick={handleTogglePanel}
          >
            <span>Добавить тег</span>
            <PlusIcon width={12} height={12} color="#383F45" />
          </button>

          {selectedTags.map((tag) => (
            <div
              key={tag.name}
              className={styles.tagChip}
              style={{ backgroundColor: tag.color, cursor: tag.id ? 'pointer' : 'default' }}
              onClick={() => handleSelectedTagClick(tag)}
            >
              <span className={styles.tagChipText}>{tag.name}</span>
              <button
                type="button"
                className={styles.tagChipClose}
                onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag.name); }}
                aria-label={`Удалить тег ${tag.name}`}
              >
                <TagCloseIcon width={12} height={12} color="#383F45" />
              </button>
            </div>
          ))}
        </div>

        <button
          className={styles.settingsButton}
          type="button"
          aria-label="Настройки"
          onClick={() => dispatch(uiSlice.setShowMobileSettings(!showMobileSettings))}
        >
          <SettingsIcon width={24} height={24} />
        </button>
      </div>

      {showTagsPanel && (
        <div className={classNames(tagStyles.tagsPanel, { [tagStyles.tagsPanelEditing]: !!editingTag })}>
          <div className={tagStyles.tagsPanelTop}>
            <div className={tagStyles.tagSearchWrapper}>
              <SearchBar
                placeholder="Поиск тега"
                value={searchQuery}
                onChange={handleSearch}
                onFocus={handleSearchFocus}
                onClick={() => {
                  if (showDropdown) setShowDropdown(false);
                }}
              />
              {showDropdown && (
                <div className={tagStyles.tagSearchDropdown}>
                  {tagsState.loading ? (
                    <div className={tagStyles.tagDropdownLoading}>
                      <Loader size={24} color="blue" />
                    </div>
                  ) : displayResults.length > 0 ? (
                    <>
                      <span className={tagStyles.tagSearchDropdownTitle}>Созданные теги</span>
                      <div
                        className={tagStyles.tagSearchDropdownScroll}
                        onScroll={handleDropdownScroll}
                      >
                        {displayResults.map((tag) => (
                          <div key={tag.id} className={tagStyles.tagSearchResultRow}>
                            <button
                              type="button"
                              className={tagStyles.tagSearchResultChip}
                              style={{ backgroundColor: tag.color || '#B8DBF1' }}
                              onClick={() => handleSelectSearchTag(tag)}
                              onDoubleClick={() => handleStartEditTag(tag)}
                            >
                              <span className={tagStyles.tagSearchResultChipText}>{tag.name}</span>
                            </button>
                            <button
                              type="button"
                              className={tagStyles.tagSearchDeleteBtn}
                              onClick={() => handleRequestDelete(tag.id)}
                              aria-label={`Удалить тег ${tag.name}`}
                            >
                              <TrashIcon width={15} height={17} color="#B0B4B8" />
                            </button>
                          </div>
                        ))}
                        {tagsState.loadingMore && (
                          <div className={tagStyles.tagScrollLoading}>
                            <Loader size={16} color="blue" />
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className={tagStyles.tagCreateSection}>
              <div className={tagStyles.tagInputWrapper}>
                <input
                  type="text"
                  className={tagStyles.tagCreateInput}
                  placeholder="Введите название тега"
                  value={tagInputValue}
                  onChange={(e) => dispatch(settingsSlice.setTagInputValue(e.target.value))}
                  onKeyDown={handleTagInputKeyDown}
                />
                <div className={tagStyles.tagColorPicker}>
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={classNames(tagStyles.tagColorButton, {
                        [tagStyles.tagColorButtonSelected]: selectedTagColor === color,
                      })}
                      style={{ backgroundColor: color }}
                      onClick={() => dispatch(settingsSlice.setSelectedTagColor(color as TagColor))}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={tagStyles.addTagBtn}
                onClick={handleAddNewTag}
              >
                <PlusIcon width={16} height={16} color="#3B82F6" />
              </button>
            </div>
          </div>

          {editingTag && (
            <div className={tagStyles.tagEditRow}>
              <div className={tagStyles.tagEditTitleRow}>
                <span className={classNames(tagStyles.tagEditLabel, tagStyles.tagEditLabelMobile)}>Редактирование тега</span>
                <div className={tagStyles.tagEditChip} style={{ backgroundColor: editColor }}>
                  <span className={tagStyles.tagEditChipText}>{editingTag.name}</span>
                  <button
                    type="button"
                    className={tagStyles.tagEditChipClose}
                    onClick={handleCancelEdit}
                  >
                    <TagCloseIcon width={12} height={12} color="#383F45" />
                  </button>
                </div>
              </div>

              <div className={tagStyles.tagEditBottomRow}>
                <span className={classNames(tagStyles.tagEditLabel, tagStyles.tagEditLabelDesktop)}>Редактирование тега</span>
                <div className={tagStyles.tagEditInputGroup}>
                  <div className={tagStyles.tagEditInputWrapper}>
                    <input
                      type="text"
                      className={tagStyles.tagEditInput}
                      placeholder="Введите новое название"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className={tagStyles.tagColorPicker}>
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={classNames(tagStyles.tagColorButton, {
                          [tagStyles.tagColorButtonSelected]: editColor === color,
                        })}
                        style={{ backgroundColor: color }}
                        onClick={() => setEditColor(color as TagColor)}
                      />
                    ))}
                  </div>
                </div>
                <div className={tagStyles.tagEditActions}>
                  <button
                    type="button"
                    className={tagStyles.tagEditDeleteBtn}
                    onClick={() => handleRequestDelete(editingTag.id)}
                    aria-label="Удалить тег"
                  >
                    <TrashIcon width={15} height={16.67} color="#B0B4B8" />
                    <span className={tagStyles.tagEditDeleteText}>Удалить тег</span>
                  </button>
                  <Button
                    text="Сохранить"
                    onClick={handleSaveEdit}
                    showArrow={false}
                    size="small"
                    className={tagStyles.tagEditSaveBtn}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Вы действительно хотите удалить тег?"
        confirmVariant="outlined-red"
      />
    </>
  );
}
