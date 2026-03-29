'use client';

import { FC, useState, useEffect, useRef } from 'react';
import ModalBase from '@/components/modal-base';
import Modal from '@/components/modal/modal';
import Input from '@/components/input';
import Loader from '@/components/loader';
import { Button } from '@/components/new-button';
import MediaPreview from '@/components/media-preview';
import InlineButtons from '@/components/inline-buttons';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import DatePickerModal from '@/components/date-picker/date-picker-modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useMessageMedia';
import { useInlineButtons } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useInlineButtons';
import { useTemplates } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useTemplates';
import { uploadMediaFile } from '@/store/api';
import OldButton from '@/components/button/button';
import RichTextEditor from '@/components/rich-text-editor/rich-text-editor.container';
import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';
import type { TextTemplate } from '@/types/post';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  createInfoMessageThunk,
  updateInfoMessageThunk,
  publishInfoMessageThunk,
} from '../../store/thunks/automation';
import { setSaving, setSavingType } from '../../store/slices/automation';
import type { SavingType } from '../../store/slices/automation';
import {
  InlineButtonIcon,
  TemplatesIcon,
  PaperclipIcon,
  EyeIcon,
  ShareIcon,
  ChevronDownIcon,
  ShortcodesIcon,
  CopyIcon,
  TelegramCircleIcon,
} from '@/components/icons';
import PostPreviewModal from '@/components/post-preview-modal';
import styles from './CreateInfoMessageModal.module.scss';

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

interface CreateInfoMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: number;
  channelTitle?: string;
}

const CreateInfoMessageModal: FC<CreateInfoMessageModalProps> = ({
  isOpen,
  onClose,
  channelId,
  channelTitle,
}) => {
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useNotifications();
  const { editingMessage, savingType } = useAppSelector((s) => s.automation);

  const [text, setText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shortcodesOpen, setShortcodesOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduleHours, setScheduleHours] = useState(new Date().getHours());
  const [scheduleMinutes, setScheduleMinutes] = useState(new Date().getMinutes());
  const [existingMedia, setExistingMedia] = useState<{ url: string; type: string } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);
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

  const {
    templates, isLoading: templatesLoading, isLoadingMore: templatesLoadingMore,
    hasMore: templatesHasMore, searchQuery: templatesSearchQuery,
    selectedTemplateId, setSearchQuery: setTemplatesSearchQuery,
    fetchMoreTemplates, updateTemplate, deleteTemplate,
  } = useTemplates();

  const isEditing = !!editingMessage;
  const canAddMedia = mediaFiles.length < 1 && !existingMedia;

  useEffect(() => {
    if (!isOpen) return;

    if (editingMessage) {
      setText(editingMessage.text || '');
      if (editingMessage.media_url && editingMessage.media_type) {
        setExistingMedia({ url: editingMessage.media_url, type: editingMessage.media_type });
      } else {
        setExistingMedia(null);
      }
      if (editingMessage.inline_keyboard && editingMessage.inline_keyboard.length > 0) {
        setButtonsOpen(true);
        setRows(editingMessage.inline_keyboard.map((row, ri) => ({
          id: `row-${ri}-${Date.now()}`,
          buttons: row.map((btn: any, bi: number) => ({
            id: `btn-${ri}-${bi}-${Date.now()}`,
            text: btn.text,
            type: 'url' as const,
            url: btn.url || '',
          })),
        })));
      } else {
        resetButtons();
      }
    } else {
      setText('');
      setExistingMedia(null);
      handleClearMedia();
      resetButtons();
    }
    setShortcodesOpen(false);
    setTemplatesOpen(false);
  }, [isOpen, editingMessage]);

  const handleSaveAsTemplate = (selectedHtml?: string) => {
    const html = (selectedHtml || text || '').trim();
    if (!html) {
      showError('Нет текста для сохранения');
      return;
    }
    const plainText = html.replace(/<[^>]*>/g, '').trim();
    const name = plainText.length > 30 ? plainText.substring(0, 30) + '...' : plainText;

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('lamaplanner_access_token') : null;

    fetch(`${API_BASE_URL}/publications/text-templates/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name, formatted_content: { text: html } }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        showSuccess('Шаблон сохранён');
      })
      .catch(() => showError('Ошибка сохранения шаблона'));
  };

  const handleTemplateSelect = (template: TextTemplate) => {
    let html = template.formatted_content?.html || template.formatted_content?.text || '';
    html = html.replace(/^<p>|<\/p>$/g, '');
    editorRef.current?.insertHtml(html);
    setTemplatesOpen(false);
  };

  const buildPayload = () => {
    const inlineKeyboard = buttonsOpen && rows.length > 0
      ? rows.map((row) => row.buttons.map((btn) => ({ text: btn.text, url: btn.url || '' })))
      : null;

    return {
      text: text || '',
      media_url: null as string | null,
      media_type: null as string | null,
      inline_keyboard: inlineKeyboard,
    };
  };

  const handleSave = async (type: SavingType) => {
    if (!text.trim() && mediaFiles.length === 0 && !existingMedia) {
      showError('Введите текст или прикрепите файл');
      return;
    }

    dispatch(setSaving(true));
    dispatch(setSavingType(type));

    try {
      const data = buildPayload();

      if (mediaFiles.length > 0 && mediaFiles[0].file) {
        const result = await uploadMediaFile(mediaFiles[0].file);
        data.media_url = result.url;
        data.media_type = MEDIA_TYPE_MAP[mediaFiles[0].type] || 'DOCUMENT';
      } else if (existingMedia) {
        data.media_url = existingMedia.url;
        data.media_type = existingMedia.type;
      }

      let savedMsg;
      if (isEditing) {
        savedMsg = await dispatch(updateInfoMessageThunk({
          channelId,
          messageId: editingMessage.id,
          data,
          savingType: type,
        })).unwrap();
      } else {
        savedMsg = await dispatch(createInfoMessageThunk({ channelId, data, savingType: type })).unwrap();
      }

      if (type === 'publish' && savedMsg) {
        await dispatch(publishInfoMessageThunk({
          channelId,
          messageId: savedMsg.id,
        })).unwrap();
        showSuccess('Сообщение опубликовано');
      } else {
        showSuccess(isEditing ? 'Сообщение обновлено' : 'Сообщение создано');
      }
      onClose();
    } catch {
      showError(type === 'publish' ? 'Ошибка публикации' : 'Ошибка сохранения');
    } finally {
      dispatch(setSaving(false));
      dispatch(setSavingType(null));
    }
  };

  const handleSchedule = async () => {
    await handleSave('schedule');
    setDatePickerOpen(false);
  };

  const handleShareClick = async () => {
    setShareModalOpen(true);

    if (isEditing) {
      setIsGeneratingShareLink(true);
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
        const token = localStorage.getItem('lamaplanner_access_token');
        const res = await fetch(`${API_BASE_URL}/channels/${channelId}/info-messages/${editingMessage.id}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        const link = `${window.location.origin}/channels/${channelId}?shared_message=${data.share_token}`;
        setShareLink(link);
      } catch {
        const plainText = text.replace(/<[^>]*>/g, '').trim();
        setShareLink(`https://t.me/share/url?url=&text=${encodeURIComponent(plainText)}`);
      } finally {
        setIsGeneratingShareLink(false);
      }
    } else {
      const plainText = text.replace(/<[^>]*>/g, '').trim();
      setShareLink(`https://t.me/share/url?url=&text=${encodeURIComponent(plainText)}`);
    }
  };

  return (
    <>
      <ModalBase isOpen={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
        <ModalBase.Content size="xl" padding="sm" className={styles.modal}>
          <div className={styles.header}>
            <Button
              variant="ghost"
              intent="primary"
              size="sm"
              className={styles.backBtn}
              onClick={onClose}
            >
              <ChevronDownIcon width={16} height={16} />
            </Button>
            <span className={styles.headerTitle}>
              {isEditing ? 'Редактирование сообщения' : 'Создание сообщения'}
            </span>
            <div className={styles.headerSpacer} />
          </div>

          <div className={styles.body}>
            <div className={styles.editorSection}>
              <RichTextEditor
                ref={editorRef}
                value={text}
                onChange={setText}
                placeholder="Напишите текст публикации..."
                maxLength={4096}
                onSaveAsTemplate={handleSaveAsTemplate}
              />

              <div className={styles.menuRow}>
                <Button
                  variant="ghost"
                  intent="neutral"
                  size="sm"
                  className={`${styles.menuBtn} ${buttonsOpen ? styles.active : ''}`}
                  onClick={toggleButtons}
                >
                  <InlineButtonIcon width={24} height={24} />
                  Кнопки
                </Button>
                <Button
                  variant="ghost"
                  intent="neutral"
                  size="sm"
                  className={`${styles.menuBtn} ${templatesOpen ? styles.active : ''}`}
                  onClick={() => setTemplatesOpen(!templatesOpen)}
                >
                  <TemplatesIcon width={24} height={24} />
                  Шаблоны
                </Button>
              </div>
              <Button
                variant="ghost"
                intent="neutral"
                size="sm"
                className={`${styles.menuBtnFull} ${shortcodesOpen ? styles.active : ''}`}
                onClick={() => setShortcodesOpen(!shortcodesOpen)}
              >
                <ShortcodesIcon width={24} height={24} />
                Шорткоды
              </Button>

              {shortcodesOpen && (
                <div className={styles.shortcodesSection}>
                  <span className={styles.shortcodesLabel}>Доступные шорткоды:</span>
                  <div className={styles.shortcodeChips}>
                    {SHORTCODES.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        className={styles.shortcodeChip}
                        onClick={() => {
                          editorRef.current?.insertHtml(s.code);
                          setShortcodesOpen(false);
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <InlineButtons
                isOpen={buttonsOpen}
                rows={rows}
                onAddRow={addRow}
                onAddColumn={addColumn}
                onUpdateButton={updateButton}
                onDeleteButton={deleteButton}
              />
            </div>

            <div className={styles.mediaSection}>
              <span className={styles.mediaSectionLabel}>Медиа и файлы</span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    setExistingMedia(null);
                    handleFilesAdd(Array.from(files));
                  }
                  e.target.value = '';
                }}
              />

              {/* Unified dropzone */}
              <div className={styles.mediaDropzone}>
                {existingMedia && mediaFiles.length === 0 ? (
                  <div className={styles.dropzoneContent}>
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
                    <OldButton
                      text="Заменить файл"
                      variant="templateCard"
                      showArrow={false}
                      icon={<PaperclipIcon width={24} height={24} />}
                      onClick={() => fileInputRef.current?.click()}
                    />
                  </div>
                ) : mediaFiles.length === 0 ? (
                  <>
                    <span className={styles.dropzoneText}>
                      Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
                    </span>
                    <OldButton
                      text="Прикрепить файл"
                      variant="templateCard"
                      showArrow={false}
                      icon={<PaperclipIcon width={24} height={24} />}
                      disabled={!canAddMedia}
                      onClick={() => fileInputRef.current?.click()}
                    />
                  </>
                ) : (
                  <div className={styles.dropzoneContent}>
                    <MediaPreview
                      files={mediaFiles}
                      onRemove={handleRemoveFile}
                      onToggleBlur={handleToggleBlur}
                      onMove={handleMoveMedia}
                    />
                    <OldButton
                      text="Прикрепить ещё"
                      variant="templateCard"
                      showArrow={false}
                      icon={<PaperclipIcon width={24} height={24} />}
                      disabled={!canAddMedia}
                      onClick={() => fileInputRef.current?.click()}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.footerTopRow}>
                <Button
                  variant="ghost"
                  intent="neutral"
                  size="sm"
                  className={styles.iconBtn}
                  onClick={() => setPreviewOpen(true)}
                >
                  <EyeIcon width={16} height={16} />
                </Button>
                <Button
                  variant="ghost"
                  intent="neutral"
                  size="sm"
                  className={styles.shareBtn}
                  onClick={handleShareClick}
                  disabled={!text.trim()}
                >
                  <ShareIcon width={24} height={24} />
                </Button>
                <Button
                  variant="outline"
                  intent="gradient"
                  size="lg"
                  className={styles.draftBtn}
                  onClick={() => handleSave('draft')}
                  loading={savingType === 'draft'}
                  disabled={savingType !== null}
                >
                  Сохранить в черновики
                </Button>
              </div>
              <div className={styles.footerBottomRow}>
                <Button
                  variant="outline"
                  intent="gradient"
                  size="lg"
                  className={styles.publishNowBtn}
                  onClick={() => handleSave('publish')}
                  loading={savingType === 'publish'}
                  disabled={savingType !== null}
                >
                  Опубликовать сейчас
                </Button>
                <Button
                  variant="fill"
                  intent="gradient"
                  size="lg"
                  className={styles.scheduleBtn}
                  onClick={() => setDatePickerOpen(true)}
                  loading={savingType === 'schedule'}
                  disabled={savingType !== null}
                >
                  Запланировать
                </Button>
              </div>
            </div>
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

      <TextTemplatesModal
        isOpen={templatesOpen}
        templates={templates}
        isLoading={templatesLoading}
        isLoadingMore={templatesLoadingMore}
        hasMore={templatesHasMore}
        searchQuery={templatesSearchQuery}
        selectedTemplateId={selectedTemplateId}
        onSearchQueryChange={setTemplatesSearchQuery}
        onLoadMore={fetchMoreTemplates}
        onUpdate={(id, changes) => updateTemplate(id, changes)}
        onDelete={(id) => deleteTemplate(id).then(() => showSuccess('Шаблон удалён'))}
        onSelect={handleTemplateSelect}
        onClose={() => setTemplatesOpen(false)}
      />

      <DatePickerModal
        isOpen={datePickerOpen}
        selectedDate={scheduledDate}
        hours={scheduleHours}
        minutes={scheduleMinutes}
        onDateChange={setScheduledDate}
        onHoursChange={setScheduleHours}
        onMinutesChange={setScheduleMinutes}
        onSchedule={handleSchedule}
        onClose={() => setDatePickerOpen(false)}
        isLoading={savingType === 'schedule'}
      />

      <div className={styles.shareModal}>
        <Modal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          onConfirm={() => setShareModalOpen(false)}
          title="Поделиться сообщением"
          hideButtons
        >
          <div className={styles.shareModalContent}>
            <p className={styles.shareDescription}>
              Скопируйте ссылку и отправьте её удобным способом или нажмите на иконку Telegram.
            </p>
            <div className={styles.shareLinkRow}>
              <div className={styles.shareLinkInput}>
                <Input
                  value={shareLink}
                  onChange={() => {}}
                  variant="white"
                  icon={<CopyIcon width={24} height={24} color="#383F45" />}
                  iconDisabled={isGeneratingShareLink || !shareLink}
                  onIconClick={() => {
                    if (!isGeneratingShareLink && shareLink) {
                      navigator.clipboard.writeText(shareLink);
                      showSuccess('Ссылка скопирована!');
                    }
                  }}
                />
                {isGeneratingShareLink && (
                  <div className={styles.shareLinkLoader}>
                    <Loader size={16} color="blue" />
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.telegramBtn}
                onClick={() => {
                  if (!isGeneratingShareLink && shareLink) {
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
                  }
                }}
                disabled={isGeneratingShareLink || !shareLink}
              >
                <TelegramCircleIcon width={32} height={32} color="#1E1E1E" />
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default CreateInfoMessageModal;
