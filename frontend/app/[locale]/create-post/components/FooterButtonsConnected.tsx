'use client';

import Button from '@/components/button/button';
import { useAppDispatch, useAppSelector } from '../store';
import * as uiSlice from '../store/slices/ui';
import { saveDraft } from '../store/thunks';

interface FooterButtonsConnectedProps {
  className?: string;
  saveDraftBtnClassName?: string;
  publishRowClassName?: string;
  publishNowBtnClassName?: string;
  scheduleBtnClassName?: string;
  onPublishNow: () => void;
  onPublishSeries: () => void;
  hasMultiplePosts: boolean;
}

export default function FooterButtonsConnected({
  className,
  saveDraftBtnClassName,
  publishRowClassName,
  publishNowBtnClassName,
  scheduleBtnClassName,
  onPublishNow,
  onPublishSeries,
  hasMultiplePosts,
}: FooterButtonsConnectedProps) {
  const dispatch = useAppDispatch();

  const isPublishing = useAppSelector(state => state.ui.isPublishing);
  const isSavingDraft = useAppSelector(state => state.ui.isSavingDraft);
  const isScheduling = useAppSelector(state => state.ui.isScheduling);

  const selectedChannels = useAppSelector(state => state.channels.channels.filter(c => c.selected));

  return (
    <div className={className}>
      <Button
        text="Сохранить в черновики"
        showArrow={false}
        className={saveDraftBtnClassName}
        onClick={() => dispatch(saveDraft(selectedChannels.map(c => c.id)))}
        loading={isSavingDraft}
        disabled={isSavingDraft}
      />
      <div className={publishRowClassName}>
        <Button
          text="Опубликовать сейчас"
          showArrow={false}
          className={publishNowBtnClassName}
          onClick={() => {
            hasMultiplePosts ? onPublishSeries() : onPublishNow();
          }}
          loading={isPublishing}
          disabled={isPublishing}
        />
        <Button
          text="Запланировать"
          showArrow={false}
          active
          loading={isScheduling}
          disabled={isScheduling}
          className={scheduleBtnClassName}
          onClick={() => dispatch(uiSlice.setShowDatePickerModal(true))}
        />
      </div>
    </div>
  );
}
