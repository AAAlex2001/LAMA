'use client';

import { FC, useState, useEffect, useRef } from 'react';
import ModalBase from '@/components/modal-base';
import { Button as GradientButton } from '@/components/new-button';
import Button from '@/components/button/button';
import MediaPreview from '@/components/media-preview';
import InlineButtons from '@/components/inline-buttons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useMessageMedia';
import { useInlineButtons } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useInlineButtons';
import { uploadMediaFile } from '@/store/api';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateWelcomeSettingsThunk } from '../../store/thunks/welcomeSettings';
import { setModalOpen } from '../../store/slices/welcomeSettings';
import { EyeIcon, PaperclipIcon, InlineButtonIcon } from '@/components/icons';
import PostPreviewModal from '@/components/post-preview-modal';
import styles from './WelcomeMessageModal.module.scss';

const SHORTCODES = [
  { code: '{user.first_name}', label: '{firstname}' },
  { code: '{user.username}', label: '{username}' },
  { code: '{user.last_name}', label: '{lastname}' },
  { code: '{chat.title}', label: '{chat}' },
  { code: '{date}', label: '{date}' },
];

const MEDIA_TYPE_MAP: Record<string, string> = {
  image: 'PHOTO',
  video: 'VIDEO',
  document: 'DOCUMENT',
};

interface WelcomeMessageModalProps {
  botId: number;
  channelTitle?: string;
}

const WelcomeMessageModal: FC<WelcomeMessageModalProps> = ({ botId, channelTitle }) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const { modalOpen, message, mediaUrl, mediaType, buttons, saving } = useAppSelector((s) => s.welcomeSettings);

  const [text, setText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    mediaFiles, handleRemoveFile,
    handleToggleBlur, handleMoveMedia, handleClearMedia,
    handleFilesAdd,
  } = useMessageMedia();

  const {
    isOpen: buttonsOpen, rows, toggle: toggleButtons,
    addRow, addColumn, updateButton, deleteButton, reset: resetButtons,
  } = useInlineButtons();

  const canAddMedia = mediaFiles.length < 1;

  useEffect(() => {
    if (modalOpen) {
      setText(message || '');
      handleClearMedia();
      resetButtons();

      if (buttons && buttons.length > 0) {
        for (const row of buttons) {
          addRow();
        }
      }
    }
  }, [modalOpen]);

  const insertShortcode = (code: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newValue = text.substring(0, start) + code + text.substring(end);
      setText(newValue);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + code.length;
          textareaRef.current.selectionEnd = start + code.length;
          textareaRef.current.focus();
        }
      });
    } else {
      setText(text + code);
    }
  };

  const handleSave = async () => {
    if (!text.trim() && mediaFiles.length === 0) {
      showError('Введите текст или прикрепите файл');
      return;
    }

    let uploadedMediaUrl: string | null = null;
    let uploadedMediaType: string | null = null;

    if (mediaFiles.length > 0) {
      try {
        const result = await uploadMediaFile(mediaFiles[0].file!);
        uploadedMediaUrl = result.url;
        uploadedMediaType = MEDIA_TYPE_MAP[mediaFiles[0].type] || 'DOCUMENT';
      } catch {
        showError('Ошибка загрузки файла');
        return;
      }
    }

    const inlineKeyboard = buttonsOpen && rows.length > 0
      ? rows.map((row) => row.buttons.map((btn) => ({ text: btn.text, url: btn.url || '' })))
      : null;

    const data: Record<string, unknown> = {
      welcome_message: text || null,
      welcome_media_url: uploadedMediaUrl ?? (mediaFiles.length === 0 ? null : mediaUrl),
      welcome_media_type: uploadedMediaType ?? (mediaFiles.length === 0 ? null : mediaType),
      welcome_buttons: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : null,
    };

    dispatch(updateWelcomeSettingsThunk({ botId, data }))
      .unwrap()
      .then(() => {
        showSuccess('Приветствие сохранено');
        dispatch(setModalOpen(false));
      })
      .catch(() => showError('Ошибка сохранения'));
  };

  return (
    <>
      <ModalBase isOpen={modalOpen} onOpenChange={(v) => dispatch(setModalOpen(v))}>
        <ModalBase.Content size="md" padding="sm" className={styles.modal}>
          <div className={styles.header}>
            <span className={styles.title}>Приветственное сообщение</span>
            <ModalBase.Close />
          </div>

          <div className={styles.body}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Текст сообщения</label>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст приветствия..."
                maxLength={1024}
                rows={4}
              />
              <div className={styles.textareaFooter}>
                <span className={styles.charCount}>{text.length}/1024</span>
              </div>
            </div>

            <div className={styles.shortcodesSection}>
              <span className={styles.shortcodesLabel}>Доступные шорткоды:</span>
              <div className={styles.shortcodeChips}>
                {SHORTCODES.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    className={styles.shortcodeChip}
                    onClick={() => insertShortcode(s.code)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.mediaSection}>
              <span className={styles.mediaSectionLabel}>Медиа и файлы</span>
              {mediaFiles.length > 0 && (
                <MediaPreview
                  files={mediaFiles}
                  onRemove={handleRemoveFile}
                  onToggleBlur={handleToggleBlur}
                  onMove={handleMoveMedia}
                />
              )}
              <Button
                text="Прикрепить файл"
                variant="templateCard"
                showArrow={false}
                icon={<PaperclipIcon width={24} height={24} />}
                fullWidth
                disabled={!canAddMedia}
                onClick={() => fileInputRef.current?.click()}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) handleFilesAdd(Array.from(files).slice(0, 1));
                  e.target.value = '';
                }}
              />
            </div>

            <div className={styles.inlineSection}>
              <Button
                text="Кнопки"
                variant="templateCard"
                showArrow={false}
                icon={<InlineButtonIcon width={24} height={24} />}
                active={buttonsOpen}
                onClick={toggleButtons}
              />
            </div>

            <InlineButtons
              isOpen={buttonsOpen}
              rows={rows}
              onAddRow={addRow}
              onAddColumn={addColumn}
              onUpdateButton={updateButton}
              onDeleteButton={deleteButton}
              hideButtonType
            />
          </div>

          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => dispatch(setModalOpen(false))}
              >
                Отменить
              </button>
            </div>
            <button
              type="button"
              className={styles.previewBtn}
              onClick={() => setPreviewOpen(true)}
            >
              <EyeIcon width={18} height={18} color="#858585" />
            </button>
            <GradientButton
              variant="fill"
              intent="gradient"
              size="lg"
              onClick={handleSave}
              loading={saving}
            >
              Сохранить
            </GradientButton>
          </div>
        </ModalBase.Content>
      </ModalBase>

      <PostPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        channelTitle={channelTitle}
        html={text}
        mediaFiles={mediaFiles}
        inlineKeyboard={
          buttonsOpen && rows.length > 0
            ? { buttons: rows.map((row) => row.buttons.map((btn) => ({ text: btn.text }))) }
            : undefined
        }
      />
    </>
  );
};

export default WelcomeMessageModal;
