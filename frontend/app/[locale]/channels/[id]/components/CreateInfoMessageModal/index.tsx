'use client';

import { FC, useState, useEffect, useRef } from 'react';
import ModalBase from '@/components/modal-base';
import { Button } from '@/components/new-button';
import TextTemplatesModal from '@/components/text-templates-modal/text-templates-modal';
import DatePickerModal from '@/components/date-picker/date-picker-modal';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/hooks/useMessageMedia';
import { useInlineButtons } from '@/hooks/useInlineButtons';
import { useTemplates } from '@/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useTemplates';
import RichTextEditor from '@/components/rich-text-editor/rich-text-editor.container';
import type { RichTextEditorRef } from '@/components/rich-text-editor/rich-text-editor.container';
import type { TextTemplate } from '@/types/post';
import {
  useCreateInfoMessageMutation,
  useUpdateInfoMessageMutation,
  usePublishInfoMessageMutation,
  type InfoMessage,
} from '@/store/channels';
import { ChevronDownIcon } from '@/components/icons';
import PostPreviewModal from '@/components/post-preview-modal';
import { MAX_MEDIA, MEDIA_TYPE_MAP } from './constants';
import { mediaFromInfoMessage, resolveUploadedUrls, type SavingType } from './helpers';
import EditorSection from './EditorSection';
import MediaSection from './MediaSection';
import FooterActions from './FooterActions';
import ShareDialog from './ShareDialog';
import styles from '../CreateInfoMessageModal.module.scss';

interface CreateInfoMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: number;
  channelTitle?: string;
  editingMessage: InfoMessage | null;
}

const CreateInfoMessageModal: FC<CreateInfoMessageModalProps> = ({
  isOpen,
  onClose,
  channelId,
  channelTitle,
  editingMessage,
}) => {
  const { showSuccess, showError } = useNotifications();
  const createMessage = useCreateInfoMessageMutation();
  const updateMessage = useUpdateInfoMessageMutation();
  const publishMessage = usePublishInfoMessageMutation();
  const [savingType, setSavingType] = useState<SavingType>(null);

  const [text, setText] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shortcodesOpen, setShortcodesOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduleHours, setScheduleHours] = useState(new Date().getHours());
  const [scheduleMinutes, setScheduleMinutes] = useState(new Date().getMinutes());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);

  const {
    mediaFiles,
    setMediaFiles,
    isUploadingMedia,
    fileInputRef,
    handleFileUpload,
    handleRemoveFile,
    handleToggleBlur,
    handleMoveMedia,
    handleClearMedia,
  } = useMessageMedia();

  const {
    isOpen: buttonsOpen,
    rows,
    toggle: toggleButtons,
    addRow,
    addColumn,
    updateButton,
    deleteButton,
    reset: resetButtons,
    setRows,
    setIsOpen: setButtonsOpen,
  } = useInlineButtons();

  const {
    templates,
    isLoading: templatesLoading,
    isLoadingMore: templatesLoadingMore,
    hasMore: templatesHasMore,
    searchQuery: templatesSearchQuery,
    selectedTemplateId,
    setSearchQuery: setTemplatesSearchQuery,
    fetchMoreTemplates,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();

  const isEditing = !!editingMessage;
  const limitedMediaFiles = mediaFiles.slice(0, MAX_MEDIA);
  const canAddMedia = limitedMediaFiles.length < MAX_MEDIA;

  useEffect(() => {
    if (!isOpen) return;

    if (editingMessage) {
      setText(editingMessage.text || '');
      setMediaFiles(mediaFromInfoMessage(editingMessage));
      if (editingMessage.inline_keyboard && editingMessage.inline_keyboard.length > 0) {
        setButtonsOpen(true);
        setRows(
          editingMessage.inline_keyboard.map((row, ri) => ({
            id: `row-${ri}-${Date.now()}`,
            buttons: row.map((btn: { text: string; url?: string }, bi: number) => ({
              id: `btn-${ri}-${bi}-${Date.now()}`,
              text: btn.text,
              type: 'url' as const,
              url: btn.url || '',
            })),
          })),
        );
      } else {
        resetButtons();
      }
    } else {
      setText('');
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

    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('lamaplanner_access_token') : null;

    fetch(`${base}/publications/text-templates/`, {
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

  const handleSave = async (type: Exclude<SavingType, null>) => {
    const hasText = text.replace(/<[^>]*>/g, '').trim().length > 0;
    if (!hasText && limitedMediaFiles.length === 0) {
      showError('Введите текст или прикрепите файл');
      return;
    }

    setSavingType(type);

    try {
      const inlineKeyboard =
        buttonsOpen && rows.length > 0
          ? rows.map((row) => row.buttons.map((btn) => ({ text: btn.text, url: btn.url || '' })))
          : null;

      const urls = await resolveUploadedUrls(limitedMediaFiles);
      const data = {
        text: text || '',
        inline_keyboard: inlineKeyboard,
        media_urls: urls.length > 0 ? urls : [],
        media_url: urls[0] ?? null,
        media_type: limitedMediaFiles[0] ? MEDIA_TYPE_MAP[limitedMediaFiles[0].type] || 'DOCUMENT' : null,
      };

      let savedMsg: InfoMessage;
      if (isEditing && editingMessage) {
        savedMsg = await updateMessage.mutateAsync({
          channelId,
          messageId: editingMessage.id,
          data,
        });
      } else {
        savedMsg = await createMessage.mutateAsync({ channelId, data });
      }

      if (type === 'publish' && savedMsg) {
        await publishMessage.mutateAsync({ channelId, messageId: savedMsg.id });
        showSuccess('Сообщение опубликовано');
      } else {
        showSuccess(isEditing ? 'Сообщение обновлено' : 'Сообщение создано');
      }
      onClose();
    } catch {
      showError(type === 'publish' ? 'Ошибка публикации' : 'Ошибка сохранения');
    } finally {
      setSavingType(null);
    }
  };

  const handleSchedule = async () => {
    await handleSave('schedule');
    setDatePickerOpen(false);
  };

  const handleShareClick = async () => {
    setShareModalOpen(true);

    if (isEditing && editingMessage) {
      setIsGeneratingShareLink(true);
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
        const token = localStorage.getItem('lamaplanner_access_token');
        const res = await fetch(`${base}/channels/${channelId}/info-messages/${editingMessage.id}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) throw new Error('Failed');
        const payload = await res.json();
        const link = `${window.location.origin}/channels/${channelId}?shared_message=${payload.share_token}`;
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

  const hasShareableContent = text.replace(/<[^>]*>/g, '').trim().length > 0 || limitedMediaFiles.length > 0;

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
            <EditorSection
              editorRef={editorRef}
              text={text}
              onTextChange={setText}
              onSaveAsTemplate={handleSaveAsTemplate}
              buttonsOpen={buttonsOpen}
              onToggleButtons={toggleButtons}
              rows={rows}
              onAddRow={addRow}
              onAddColumn={addColumn}
              onUpdateButton={updateButton}
              onDeleteButton={deleteButton}
              templatesOpen={templatesOpen}
              onToggleTemplates={() => setTemplatesOpen(!templatesOpen)}
              shortcodesOpen={shortcodesOpen}
              onToggleShortcodes={() => setShortcodesOpen(!shortcodesOpen)}
              onCloseShortcodes={() => setShortcodesOpen(false)}
            />

            <MediaSection
              fileInputRef={fileInputRef}
              files={limitedMediaFiles}
              isUploading={isUploadingMedia}
              canAddMedia={canAddMedia}
              onFileUpload={handleFileUpload}
              onRemove={handleRemoveFile}
              onToggleBlur={handleToggleBlur}
              onMove={handleMoveMedia}
            />

            <FooterActions
              savingType={savingType}
              isEditing={isEditing}
              hasShareableContent={hasShareableContent}
              onPreview={() => setPreviewOpen(true)}
              onShare={handleShareClick}
              onSaveDraft={() => handleSave('draft')}
              onPublish={() => handleSave('publish')}
              onSchedule={() => setDatePickerOpen(true)}
            />
          </div>
        </ModalBase.Content>
      </ModalBase>

      <PostPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        channelTitle={channelTitle}
        html={text}
        mediaFiles={limitedMediaFiles}
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

      <ShareDialog
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareLink={shareLink}
        isGenerating={isGeneratingShareLink}
      />
    </>
  );
};

export default CreateInfoMessageModal;
