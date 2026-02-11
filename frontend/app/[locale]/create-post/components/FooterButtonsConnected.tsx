'use client';

import Button from '@/components/button/button';
import { TrashIcon } from '@/components/icons';
import { useAppDispatch, useAppSelector } from '../store';
import * as uiSlice from '../store/slices/ui';
import { saveDraft } from '../store/thunks';
import { selectSelectedChannels } from '../store/selectors';
import { useNotifications } from '@/components/notifications/NotificationProvider';

interface FooterButtonsConnectedProps {
  className?: string;
  saveDraftBtnClassName?: string;
  deleteFromSeriesBtnClassName?: string;
  leftGroupClassName?: string;
  publishRowClassName?: string;
  publishNowBtnClassName?: string;
  scheduleBtnClassName?: string;
  onPublishNow: () => void;
  onPublishSeries: () => void;
  hasMultiplePosts: boolean;
  onRemovePost: (index: number) => void;
}

export default function FooterButtonsConnected({
  className,
  saveDraftBtnClassName,
  deleteFromSeriesBtnClassName,
  leftGroupClassName,
  publishRowClassName,
  publishNowBtnClassName,
  scheduleBtnClassName,
  onPublishNow,
  onPublishSeries,
  hasMultiplePosts,
  onRemovePost,
}: FooterButtonsConnectedProps) {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();

  const isPublishing = useAppSelector(state => state.ui.isPublishing);
  const isScheduling = useAppSelector(state => state.ui.isScheduling);
  const isSavingDraft = useAppSelector(state => state.ui.isSavingDraft);
  const snapshots = useAppSelector(state => state.series.snapshots);
  const activeIndex = useAppSelector(state => state.series.activeIndex);
  const selectedChannels = useAppSelector(selectSelectedChannels);

  const canDeleteFromSeries = snapshots.length > 1;

  return (
    <div className={className}>
      <div className={leftGroupClassName}>
        <Button
          text="Сохранить в черновики"
          showArrow={false}
          className={saveDraftBtnClassName}
          active
          loading={isSavingDraft}
          disabled={isSavingDraft}
          onClick={async () => {
            const result = await dispatch(saveDraft(selectedChannels.map((c) => c.id)));
            if (saveDraft.fulfilled.match(result)) {
              showSuccess('Черновик сохранён!');
              setTimeout(() => {
                window.location.href = '/drafts';
              }, 3000);
            } else if (saveDraft.rejected.match(result)) {
              showError(typeof result.payload === 'string' ? result.payload : 'Ошибка сохранения черновика');
            }
          }}
        />
        {canDeleteFromSeries && (
          <Button
            text="Удалить из серии"
            variant="delete"
            showArrow={false}
            icon={<TrashIcon width={15} height={16.67} />}
            className={deleteFromSeriesBtnClassName}
            onClick={() => onRemovePost(activeIndex)}
          />
        )}
      </div>
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
