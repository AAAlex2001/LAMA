'use client';

import { FC, useState } from 'react';
import { EyeIcon, TrashIcon, EditNameIcon, PlusIcon } from '@/components/icons';
import Toggle from '@/components/toggle/toggle';
import Checkbox from '@/components/checkbox/checkbox';
import Tooltip from '@/components/tooltip/tooltip';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import PostPreviewModal from '@/components/post-preview-modal';
import {
  useWelcomeSettingsQuery,
  useToggleWelcomeMutation,
  useUpdateWelcomeSettingsMutation,
  useDeleteWelcomeMessageMutation,
  useForumTopicsQuery,
  type WelcomeUpdateRequest,
} from '@/store/channels';
import WelcomeMessageModal from '../WelcomeMessageModal';
import { WELCOME_TYPE_OPTIONS } from './constants';
import { ChevronPickerIcon } from './helpers';
import styles from '../JoinSettingsSection.module.scss';

interface WelcomeBlockProps {
  botId: number;
  channelId: number;
  channelTitle: string;
  isForum: boolean;
  openPicker: string | null;
  setOpenPicker: (key: string | null) => void;
}

const WelcomeBlock: FC<WelcomeBlockProps> = ({ botId, channelId, channelTitle, isForum, openPicker, setOpenPicker }) => {
  const { showSuccess, showError } = useNotifications();
  const welcomeQuery = useWelcomeSettingsQuery(botId);
  const toggleWelcome = useToggleWelcomeMutation();
  const updateWelcome = useUpdateWelcomeSettingsMutation();
  const deleteWelcomeMessage = useDeleteWelcomeMessageMutation();
  const topicsQuery = useForumTopicsQuery(isForum ? channelId : null);
  const topics = topicsQuery.data ?? [];

  const welcome = welcomeQuery.data ?? {
    enabled: false,
    message: null as string | null,
    mediaUrl: null as string | null,
    mediaType: null as 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'ANIMATION' | null,
    buttons: null as { text: string; url?: string }[][] | null,
    messageThreadId: null as number | null,
    welcomeType: 'group_message',
  };
  const loaded = welcomeQuery.isSuccess;
  const saving = toggleWelcome.isPending || updateWelcome.isPending || deleteWelcomeMessage.isPending;

  const [previewOpen, setPreviewOpen] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<'preview' | 'delete' | 'edit' | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleToggle = async (checked: boolean) => {
    try {
      await toggleWelcome.mutateAsync({ botId, enabled: checked });
      showSuccess(checked ? 'Приветствие включено' : 'Приветствие выключено');
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const handleDeleteMessage = async () => {
    try {
      await deleteWelcomeMessage.mutateAsync(botId);
      showSuccess('Сообщение удалено');
    } catch {
      showError('Ошибка удаления');
    }
  };

  const handleUpdate = async (data: WelcomeUpdateRequest, successMsg: string) => {
    setOpenPicker(null);
    try {
      await updateWelcome.mutateAsync({ botId, data });
      showSuccess(successMsg);
    } catch {
      showError('Ошибка сохранения');
    }
  };

  const welcomeTypeSummary = WELCOME_TYPE_OPTIONS.find((o) => o.value === welcome.welcomeType)?.label || 'Сообщение в группу';
  const selectedTopic = topics.find((t) => t.thread_id === (welcome.messageThreadId ?? 1));
  const topicSummary = selectedTopic?.name || 'Общий';
  const hasWelcomeMessage = !!welcome.message || !!welcome.mediaUrl;

  return (
    <div className={styles.column}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleLabel}>Приветствие нового участника</span>
        <Toggle
          checked={welcome.enabled}
          onChange={handleToggle}
          disabled={saving || !loaded}
        />
      </div>

      {welcome.enabled && (
        <div className={styles.welcomeSection}>
          <div className={styles.welcomeControlsFrame}>
            <div className={styles.welcomeTypePickerWrap}>
              <div
                className={styles.pickerRow}
                onClick={() => setOpenPicker(openPicker === 'welcomeType' ? null : 'welcomeType')}
              >
                <span className={styles.pickerLabel}>Тип приветствия</span>
                <div className={styles.pickerRight}>
                  <span className={styles.pickerValueText}>{welcomeTypeSummary}</span>
                  <ChevronPickerIcon className={`${styles.pickerChevron} ${openPicker === 'welcomeType' ? styles.pickerChevronOpen : ''}`} />
                </div>
              </div>
              {openPicker === 'welcomeType' && (
                <div className={styles.pickerOptions}>
                  {WELCOME_TYPE_OPTIONS.map((opt) => (
                    <div key={opt.value} className={styles.checkboxRow} onClick={() => handleUpdate({ welcome_type: opt.value }, 'Тип приветствия обновлён')}>
                      <Checkbox
                        variant="radio"
                        checked={opt.value === welcome.welcomeType}
                        onChange={() => handleUpdate({ welcome_type: opt.value }, 'Тип приветствия обновлён')}
                        label={opt.label}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={`${styles.addMessageBtn} ${hasWelcomeMessage ? styles.addMessageBtnDisabled : ''}`}
              onClick={() => !hasWelcomeMessage && setModalOpen(true)}
              disabled={hasWelcomeMessage}
            >
              <PlusIcon width={16} height={16} color={hasWelcomeMessage ? '#B0B4B8' : '#3B82F6'} />
              Сообщение
            </button>

            {isForum && welcome.welcomeType === 'group_message' && topics.length > 0 && (
              <div className={styles.welcomeTopicPickerWrap}>
                <div
                  className={styles.pickerRow}
                  onClick={() => setOpenPicker(openPicker === 'welcomeTopic' ? null : 'welcomeTopic')}
                >
                  <span className={styles.pickerLabel}>Отправлять в топик</span>
                  <div className={styles.pickerRight}>
                    <span className={styles.pickerValueText}>{topicSummary}</span>
                    <ChevronPickerIcon className={`${styles.pickerChevron} ${openPicker === 'welcomeTopic' ? styles.pickerChevronOpen : ''}`} />
                  </div>
                </div>
                {openPicker === 'welcomeTopic' && (
                  <div className={styles.pickerOptions}>
                    {topics.filter((t) => !t.is_closed).map((topic) => (
                      <div key={topic.thread_id} className={styles.checkboxRow} onClick={() => handleUpdate({ welcome_message_thread_id: topic.thread_id }, 'Топик обновлён')}>
                        <Checkbox
                          variant="radio"
                          checked={topic.thread_id === (welcome.messageThreadId ?? 1)}
                          onChange={() => handleUpdate({ welcome_message_thread_id: topic.thread_id }, 'Топик обновлён')}
                          label={topic.name}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {hasWelcomeMessage && (
            <div className={styles.messageCard}>
              <div className={styles.messageHeader}>
                <span className={styles.messageTitle}>Сообщение</span>
                <div className={styles.messageActions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setPreviewOpen(true)}
                    onMouseEnter={() => setHoveredAction('preview')}
                    onMouseLeave={() => setHoveredAction(null)}
                  >
                    <EyeIcon width={16} height={16} color="#B0B4B8" />
                    {hoveredAction === 'preview' && <Tooltip text="Предпросмотр" />}
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.actionButtonBordered} ${styles.actionButtonDelete}`}
                    onClick={handleDeleteMessage}
                    onMouseEnter={() => setHoveredAction('delete')}
                    onMouseLeave={() => setHoveredAction(null)}
                  >
                    <TrashIcon width={15} height={16.67} color="#B0B4B8" />
                    {hoveredAction === 'delete' && <Tooltip text="Удалить" />}
                  </button>
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.actionButtonEdit}`}
                    onClick={() => setModalOpen(true)}
                    onMouseEnter={() => setHoveredAction('edit')}
                    onMouseLeave={() => setHoveredAction(null)}
                  >
                    <EditNameIcon width={24} height={24} color="#000000" />
                    {hoveredAction === 'edit' && <Tooltip text="Редактировать" />}
                  </button>
                </div>
              </div>

              <div className={styles.messageBody}>
                {welcome.message && (
                  <p className={styles.messageText}>{welcome.message}</p>
                )}
                {welcome.mediaUrl && (
                  <div className={styles.messageContentRow}>
                    <div className={styles.mediaThumbnail}>
                      {welcome.mediaType === 'PHOTO' || welcome.mediaType === 'ANIMATION' ? (
                        <img src={welcome.mediaUrl} alt="" className={styles.thumbnailImg} />
                      ) : welcome.mediaType === 'VIDEO' ? (
                        <video src={welcome.mediaUrl} className={styles.thumbnailImg} />
                      ) : (
                        <div className={styles.thumbnailDoc}>DOC</div>
                      )}
                    </div>
                  </div>
                )}
                {welcome.buttons && welcome.buttons.length > 0 && (
                  <div className={styles.inlineButtonsPreview}>
                    {welcome.buttons.map((row, rowIdx) =>
                      row.map((btn, btnIdx) => (
                        <span key={`${rowIdx}-${btnIdx}`} className={styles.inlineButtonPill}>
                          {btn.text}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <WelcomeMessageModal
        botId={botId}
        channelTitle={channelTitle}
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
      />

      <PostPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        channelTitle={channelTitle}
        html={welcome.message || ''}
        mediaFiles={
          welcome.mediaUrl
            ? [{
                id: 'welcome-media',
                type: (welcome.mediaType === 'VIDEO' ? 'video' : welcome.mediaType === 'DOCUMENT' ? 'document' : 'image') as 'image' | 'video' | 'document',
                url: welcome.mediaUrl,
              }]
            : []
        }
        inlineKeyboard={
          welcome.buttons
            ? { buttons: welcome.buttons.map((row) => row.map((btn) => ({ text: btn.text }))) }
            : undefined
        }
      />
    </div>
  );
};

export default WelcomeBlock;
