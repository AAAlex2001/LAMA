'use client';

import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import SearchBar from '@/components/search-bar/search-bar';
import DeleteConfirmationModal from '@/components/modal/modal';
import { TAG_COLORS } from '@/types';
import type { Tag, TagColor } from '@/types';
import {
  useTagsQuery,
  useSearchTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} from '@/store/tags/queries';
import { useAppDispatch, useAppSelector } from '../../store';
import * as settingsSlice from '../../store/slices/settings';
import * as uiSlice from '../../store/slices/ui';
import TagSearchDropdown from './TagSearchDropdown';
import TagCreateRow from './TagCreateRow';
import TagEditRow from './TagEditRow';
import tagStyles from '../../tags.module.scss';

export default function TagsPanelConnected() {
  const dispatch = useAppDispatch();
  const selectedTagColor = useAppSelector((s) => s.settings.selectedTagColor);
  const tagInputValue = useAppSelector((s) => s.settings.tagInputValue);

  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: number; name: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<TagColor>('#FAC7C7');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSearchActive = searchQuery.trim().length > 0;

  const { data: recentTags = [], isLoading: isTagsLoading } = useTagsQuery();
  const { data: searchResults = [], isFetching: isSearching } = useSearchTagsQuery(searchQuery);
  const createTag = useCreateTagMutation();
  const updateTag = useUpdateTagMutation();
  const deleteTag = useDeleteTagMutation();

  useEffect(() => {
    if (!showDropdown) return;
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    const id = requestAnimationFrame(() => document.addEventListener('mousedown', onMouseDown));
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [showDropdown]);

  function startEditing(tag: Tag) {
    const color = (tag.color && TAG_COLORS.includes(tag.color as TagColor))
      ? (tag.color as TagColor)
      : '#FAC7C7';
    setEditingTag({ id: tag.id, name: tag.name });
    setEditName(tag.name);
    setEditColor(color);
  }

  function cancelEditing() {
    setEditingTag(null);
    setEditName('');
    setEditColor('#FAC7C7');
  }

  function pickTag(tag: Tag) {
    const color = (tag.color && TAG_COLORS.includes(tag.color as TagColor))
      ? (tag.color as TagColor)
      : '#B8DBF1';
    dispatch(settingsSlice.addTag({ id: tag.id, name: tag.name, color }));
    setSearchQuery('');
    setShowDropdown(false);
  }

  async function addNewTag() {
    const name = tagInputValue.trim();
    if (!name) return;
    const color = selectedTagColor;
    dispatch(settingsSlice.addTag({ name, color }));
    dispatch(settingsSlice.setTagInputValue(''));
    try {
      const created = await createTag.mutateAsync({ name, color });
      dispatch(settingsSlice.updateSelectedTagId({ name, id: created.id }));
    } catch {
    }
  }

  async function saveEdit() {
    if (!editingTag) return;
    const name = editName.trim() || editingTag.name;
    try {
      await updateTag.mutateAsync({ id: editingTag.id, name, color: editColor });
      dispatch(settingsSlice.updateSelectedTag({ id: editingTag.id, name, color: editColor }));
    } finally {
      cancelEditing();
    }
  }

  function confirmDelete() {
    if (deleteConfirmId === null) return;
    const tag = [...recentTags, ...searchResults].find((t) => t.id === deleteConfirmId);
    deleteTag.mutate(deleteConfirmId);
    if (tag) dispatch(settingsSlice.removeSelectedTag(tag.name));
    if (editingTag?.id === deleteConfirmId) cancelEditing();
    setDeleteConfirmId(null);
  }

  const dropdownResults = isSearchActive ? searchResults : recentTags;
  const isDropdownLoading = isSearchActive ? isSearching : isTagsLoading;

  return (
    <>
      <div className={classNames(tagStyles.tagsPanel, { [tagStyles.tagsPanelEditing]: !!editingTag })}>
        <div className={tagStyles.tagsPanelTop}>
          <div className={tagStyles.tagSearchWrapper} ref={dropdownRef}>
            <SearchBar
              placeholder="Поиск тега"
              value={searchQuery}
              onChange={setSearchQuery}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && (
              <TagSearchDropdown
                results={dropdownResults}
                isLoading={isDropdownLoading}
                isSearchActive={isSearchActive}
                onPick={pickTag}
                onEditPick={(tag) => {
                  startEditing(tag);
                  dispatch(uiSlice.setShowTagsPanel(true));
                }}
                onDelete={setDeleteConfirmId}
              />
            )}
          </div>

          <TagCreateRow
            inputValue={tagInputValue}
            selectedColor={selectedTagColor}
            onInputChange={(v) => dispatch(settingsSlice.setTagInputValue(v))}
            onColorChange={(c) => dispatch(settingsSlice.setSelectedTagColor(c))}
            onAdd={addNewTag}
          />
        </div>

        {editingTag && (
          <TagEditRow
            name={editingTag.name}
            editName={editName}
            editColor={editColor}
            onNameChange={setEditName}
            onColorChange={setEditColor}
            onCancel={cancelEditing}
            onSave={saveEdit}
            onDelete={() => setDeleteConfirmId(editingTag.id)}
          />
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Вы действительно хотите удалить тег?"
        confirmVariant="outlined-red"
      />
    </>
  );
}
