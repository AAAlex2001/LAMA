'use client';

import { FC, useState, useEffect, useRef } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import OldButton from '@/components/button/button';
import MediaPreview from '@/components/media-preview';
import InlineButtons from '@/components/inline-buttons';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useMessageMedia';
import { useInlineButtons } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useInlineButtons';
import { uploadMediaFile } from '@/store/api';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateWelcomeSettingsThunk } from '../../store/thunks/welcomeSettings';
import { setModalOpen, setSaving } from '../../store/slices/welcomeSettings';
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
  const [existingMedia, setExistingMedia] = useState<{ url: string; type: string } | null>(null);
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
    setRows, setIsOpen: setButtonsOpen,
  } = useInlineButtons();

  const canAddMedia = mediaFiles.length < 1 && !existingMedia;

  useEffect(() => {
    if (!modalOpen) return;

    setText(message || '');
    handleClearMedia();

    if (mediaUrl && mediaType) {
      setExistingMedia({ url: mediaUrl, type: mediaType });
    } else {
      setExistingMedia(null);
    }

    if (buttons && buttons.length > 0) {
      setButtonsOpen(true);
      setRows(buttons.map((row, ri) => ({
        id: `row-${ri}-${Date.now()}`,
        buttons: row.map((btn, bi) => ({
          id: `btn-${ri}-${bi}-${Date.now()}`,
          text: btn.text,
          type: 'url' as const,
          url: btn.url || '',
        })),
      })));
    } else {
      resetButtons();
    }
  }, [modalOpen, message, mediaUrl, mediaType, buttons]);

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
    if (!text.trim() && mediaFiles.length === 0 && !existingMedia) {
      showError('Введите текст или прикрепите файл');
      return;
    }

    dispatch(setSaving(true));

    let uploadedMediaUrl: string | null = null;
    let uploadedMediaType: string | null = null;

    if (mediaFiles.length > 0 && mediaFiles[0].file) {
      try {
        const result = await uploadMediaFile(mediaFiles[0].file);
        uploadedMediaUrl = result.url;
        uploadedMediaType = MEDIA_TYPE_MAP[mediaFiles[0].type] || 'DOCUMENT';
      } catch {
        showError('Ошибка загрузки файла');
        dispatch(setSaving(false));
        return;
      }
    }

    const inlineKeyboard = buttonsOpen && rows.length > 0
      ? rows.map((row) => row.buttons.map((btn) => ({ text: btn.text, url: btn.url || '' })))
      : null;

    const data: Record<string, unknown> = {
      welcome_message: text || null,
      welcome_media_url: uploadedMediaUrl ?? (existingMedia ? existingMedia.url : null),
      welcome_media_type: uploadedMediaType ?? (existingMedia ? existingMedia.type : null),
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
              {existingMedia && mediaFiles.length === 0 && (
                <div className={styles.existingMedia}>
                  {existingMedia.type === 'PHOTO' || existingMedia.type === 'ANIMATION' ? (
                    <img src={existingMedia.url} alt="" className={styles.existingMediaImg} />
                  ) : existingMedia.type === 'VIDEO' ? (
                    <video src={existingMedia.url} className={styles.existingMediaImg} />
                  ) : (
                    <div className={styles.existingMediaDoc}>DOC</div>
                  )}
                  <button
                    type="button"
                    className={styles.existingMediaRemove}
                    onClick={() => setExistingMedia(null)}
                  >
                    &times;
                  </button>
                </div>
              )}
              {mediaFiles.length > 0 && (
                <MediaPreview
                  files={mediaFiles}
                  onRemove={handleRemoveFile}
                  onToggleBlur={handleToggleBlur}
                  onMove={handleMoveMedia}
                />
              )}
              <OldButton
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
                  if (files) {
                    setExistingMedia(null);
                    handleFilesAdd(Array.from(files).slice(0, 1));
                  }
                  e.target.value = '';
                }}
              />
            </div>

            <OldButton
              text="Кнопки"
              variant="templateCard"
              showArrow={false}
              icon={<InlineButtonIcon width={24} height={24} />}
              active={buttonsOpen}
              fullWidth
              onClick={toggleButtons}
            />

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
              <Button
                variant="outline"
                intent="neutral"
                size="lg"
                onClick={() => dispatch(setModalOpen(false))}
              >
                Отменить
              </Button>
            </div>
            <button
              type="button"
              className={styles.previewBtn}
              onClick={() => setPreviewOpen(true)}
            >
              <EyeIcon width={18} height={18} color="#858585" />
            </button>
            <Button
              variant="fill"
              intent="gradient"
              size="lg"
              onClick={handleSave}
              loading={saving}
            >
              Сохранить
            </Button>
          </div>
        </ModalBase.Content>
      </ModalBase>

      <PostPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        channelTitle={channelTitle}
        html={text}
        mediaFiles={
          mediaFiles.length > 0
            ? mediaFiles
            : existingMedia
              ? [{
                  id: 'existing',
                  type: (existingMedia.type === 'VIDEO' ? 'video' : existingMedia.type === 'DOCUMENT' ? 'document' : 'image') as 'image' | 'video' | 'document',
                  url: existingMedia.url,
                }]
              : []
        }
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
