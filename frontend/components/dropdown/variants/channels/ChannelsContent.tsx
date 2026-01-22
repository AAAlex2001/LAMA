'use client';

import { useState } from 'react';
import styles from './channels.module.scss';
import Checkbox from '@/components/checkbox/checkbox';
import Button from '@/components/button/button';
import SearchBar from '@/components/search-bar/search-bar';
import Loader from '@/components/loader';
import type { ChannelsContentProps } from '../../types';

export default function ChannelsContent({
  options,
  showSearch,
  showCheckboxes,
  placeholder,
  loading,
  selectedCount,
  totalCount,
  addNewLabel,
  onOptionChange,
  onAddNew,
}: ChannelsContentProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {showSearch && (
        <SearchBar
          placeholder={placeholder}
          value={searchQuery}
          onChange={setSearchQuery}
        />
      )}

      <div className={styles.optionsList}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Loader size={24} color="blue" />
          </div>
        ) : (
          filteredOptions.map((option) => (
            <div key={option.id} className={styles.optionRow}>
              {showCheckboxes ? (
                <>
                  <Checkbox
                    checked={option.checked || false}
                    onChange={(checked) => onOptionChange?.(option.id, checked)}
                  />
                  <span className={styles.optionLabel}>{option.label}</span>
                </>
              ) : (
                <span className={styles.optionLabelGradient}>{option.label}</span>
              )}
            </div>
          ))
        )}
      </div>

      {(onAddNew || (selectedCount !== undefined && totalCount !== undefined)) && (
        <div className={styles.footer}>
          <Button
            text={addNewLabel}
            showArrow={false}
            fullWidth
            onClick={onAddNew}
            counter={
              selectedCount !== undefined && totalCount !== undefined
                ? `${selectedCount}/${totalCount}`
                : undefined
            }
          />
        </div>
      )}
    </>
  );
}
