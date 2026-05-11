'use client';

import { useAppDispatch, useAppSelector } from '../../store';
import * as settingsSlice from '../../store/slices/settings';
import * as uiSlice from '../../store/slices/ui';
import SelectedTagsRow from './SelectedTagsRow';
import TagsPanelConnected from './TagsPanelConnected';

interface Props {
  className?: string;
  headerRef?: React.RefObject<HTMLDivElement | null>;
  showSettingsButton?: boolean;
}

export default function EditorHeaderConnected({
  className,
  headerRef,
  showSettingsButton = true,
}: Props) {
  const dispatch = useAppDispatch();
  const selectedTags = useAppSelector((s) => s.settings.selectedTags);
  const showTagsPanel = useAppSelector((s) => s.ui.showTagsPanel);
  const showMobileSettings = useAppSelector((s) => s.ui.showMobileSettings);

  return (
    <>
      <div className={className} ref={headerRef}>
        <SelectedTagsRow
          tags={selectedTags}
          onAddClick={() => dispatch(uiSlice.setShowTagsPanel(!showTagsPanel))}
          onTagClick={(tag) => {
            if (tag.id) dispatch(uiSlice.setShowTagsPanel(true));
          }}
          onRemove={(name) => dispatch(settingsSlice.removeSelectedTag(name))}
          onSettingsClick={
            showSettingsButton
              ? () => dispatch(uiSlice.setShowMobileSettings(!showMobileSettings))
              : undefined
          }
        />
      </div>
      {showTagsPanel && <TagsPanelConnected />}
    </>
  );
}
