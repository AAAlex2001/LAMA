'use client';

import { FC, useEffect, useRef, useState } from 'react';
import ModalBase from '@/components/modal-base';
import Input from '@/components/input/input';
import Checkbox from '@/components/checkbox/checkbox';
import { Button } from '@/components/new-button';
import {
  ChevronDownIcon,
  EyeIcon,
  InlineButtonIcon,
  PaperclipIcon,
} from '@/components/icons';
import MediaPreview, { type MediaFile } from '@/components/media-preview';
import InlineButtons from '@/components/inline-buttons/inline-buttons';
import PostPreviewModal from '@/components/post-preview-modal/post-preview-modal';
import type { InlineKeyboardPreviewData } from '@/components/post-preview-modal/inline-keyboard-preview/inline-keyboard-preview';
import OldButton from '@/components/button/button';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useMessageMedia } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useMessageMedia';
import { useInlineButtons } from '@/app/[locale]/inbox/chat/components/InboxDirect/components/DirectChat/components/MessageField/hooks/useInlineButtons';
import { uploadMediaFile, API_BASE_URL } from '@/store/api';
import { buildInlineKeyboard } from '@/store/utils';
import type { InlineKeyboard, ButtonRow } from '@/types/post';
import { useBotCommandDispatch, useBotCommandSelector } from './store';
import SearchBar from '@/components/search-bar/search-bar';
import { useAppDispatch as useChannelsAppDispatch, useAppSelector as useChannelsAppSelector } from '@/app/[locale]/channels/store';
import { fetchChannelsThunk } from '@/store/channels';
import ChannelsConnectModal from '@/app/[locale]/channels/components/ConnectChannelModal';
import {
  close,
  setCommand,
  setResponseText,
  setScope,
  setIsSubmitting,
} from './store/slices/form';
import { createBotCommandThunk, updateBotCommandThunk } from './store/thunks';
import styles from './CreateBotCommandModal.module.scss';

interface CreateBotCommandModalProps {
  botId: number;
  channelId: number;
  channelTitle?: string;
}

const MAX_RESPONSE_LENGTH = 1024;

const SHORTCODES = [
  { code: '{user.username}', label: '{username}' },
  { code: '{user.first_name}', label: '{firstname}' },
  { code: '{date}', label: '{date}' },
];

const PREVIEW_REPLACEMENTS: Record<string, string> = {
  '{user.username}': '@username',
  '{user.first_name}': 'Иван',
  '{date}': '29.03.2026',
};

function renderPreview(text: string): string {
  return Object.entries(PREVIEW_REPLACEMENTS).reduce(
    (t, [key, val]) => t.replaceAll(key, val),
    text,
  );
}

function mediaFilesFromUrls(urls: string[]): MediaFile[] {
  return urls.map((url, i) => {
    const isVideo = /\.(mp4|mov|avi|webm)/i.test(url);
    return {
      id: `edit-${i}-${Date.now()}`,
      type: isVideo ? 'video' : 'image',
      url,
      preview_url: url,
    } as MediaFile;
  });
}

function buttonRowsFromKeyboard(kb: InlineKeyboard): ButtonRow[] {
  return kb.buttons.map((row) => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    buttons: row.map((btn) => ({
      id: `btn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: btn.text,
      type: btn.type ?? 'url',
      url: btn.url,
      callback_action: btn.callback_action,
      callback_response: btn.callback_response,
      hidden_text_subscribed: btn.hidden_text_subscribed,
      hidden_text_unsubscribed: btn.hidden_text_unsubscribed,
    })),
  }));
}

const CreateBotCommandModal: FC<CreateBotCommandModalProps> = ({
  botId,
  channelId,
  channelTitle,
}) => {
  const dispatch = useBotCommandDispatch();
  const { showSuccess, showError } = useNotifications();
  const form = useBotCommandSelector((s) => s.form);
  const isEditing = form.editingId !== null;

  const [inlineButtonsOpen, setInlineButtonsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [commandActionType, setCommandActionType] = useState<'MESSAGE' | 'CLAIM_ADMIN'>('MESSAGE');
  const [claimSearch, setClaimSearch] = useState('');
  const [claimRecipientTarget, setClaimRecipientTarget] = useState<'ADMINS' | 'INBOX' | 'SPECIFIC_CHANNEL'>('ADMINS');
  const [claimSelectedChannelIds, setClaimSelectedChannelIds] = useState<number[]>([]);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  const appDispatch = useChannelsAppDispatch();
  const claimChannels = useChannelsAppSelector((s) => s.channels.channels);

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
    rows: inlineButtonRows,
    addRow: addInlineButtonRow,
    addColumn: addInlineButtonColumn,
    updateButton: updateInlineButton,
    deleteButton: deleteInlineButton,
    reset: resetInlineButtons,
    setRows: setInlineButtonRows,
  } = useInlineButtons();

  const MAX_MEDIA = 10;
  const limitedMediaFiles = mediaFiles.slice(0, MAX_MEDIA);
  const canAddMedia = limitedMediaFiles.length < MAX_MEDIA;

  const inGroup = form.scope === 'GROUPS' || form.scope === 'ALL';
  const inPrivate = form.scope === 'PRIVATE' || form.scope === 'ALL';

  const applyScopeCheckboxes = (nextGroup: boolean, nextPrivate: boolean) => {
    if (!nextGroup && !nextPrivate) {
      dispatch(setScope('GROUPS'));
      return;
    }
    if (nextGroup && nextPrivate) dispatch(setScope('ALL'));
    else if (nextGroup) dispatch(setScope('GROUPS'));
    else dispatch(setScope('PRIVATE'));
  };

  useEffect(() => {
    if (!form.isOpen) return;
    handleClearMedia();
    resetInlineButtons();
    setInlineButtonsOpen(false);
    setPreviewOpen(false);
    setCommandActionType(form.actionType || 'MESSAGE');
    setClaimSearch('');
    setClaimRecipientTarget(form.claimTarget || 'ADMINS');
    setClaimSelectedChannelIds([]);
    if (form.editingId !== null) {
      if (form.responseMediaUrls.length > 0) {
        setMediaFiles(mediaFilesFromUrls(form.responseMediaUrls));
      }
      if (form.responseButtons?.buttons?.length) {
        setInlineButtonRows(buttonRowsFromKeyboard(form.responseButtons));
        setInlineButtonsOpen(true);
      }

      setClaimSelectedChannelIds(form.claimChannelIds || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.isOpen, form.editingId]);

  useEffect(() => {
    if (!form.isOpen) return;
    if (commandActionType !== 'CLAIM_ADMIN') return;
    if (claimRecipientTarget !== 'SPECIFIC_CHANNEL') return;
    appDispatch(fetchChannelsThunk({ page: 1, pageSize: 100, force: true }));
  }, [form.isOpen, commandActionType, claimRecipientTarget, appDispatch]);

  useEffect(() => {
    if (claimRecipientTarget !== 'SPECIFIC_CHANNEL') setClaimSelectedChannelIds([]);
  }, [claimRecipientTarget]);

  const handleClose = () => {
    dispatch(close());
    handleClearMedia();
    resetInlineButtons();
    setInlineButtonsOpen(false);
    setPreviewOpen(false);
    setCommandActionType('MESSAGE');
    setClaimSearch('');
    setClaimRecipientTarget('ADMINS');
    setClaimSelectedChannelIds([]);
    setConnectModalOpen(false);
  };

  const handleToggleInlineButtons = () => {
    if (!inlineButtonsOpen && inlineButtonRows.length === 0) {
      addInlineButtonRow();
    }
    setInlineButtonsOpen(!inlineButtonsOpen);
  };

  const normalizeCommand = (raw: string): string => {
    const t = raw.trim();
    if (!t) return t;
    return t.startsWith('/') ? t : `/${t}`;
  };

  const handleInsertShortcode = (code: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = form.responseText.substring(0, start) + code + form.responseText.substring(end);
      if (newText.length <= MAX_RESPONSE_LENGTH) {
        dispatch(setResponseText(newText));
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + code.length, start + code.length);
        }, 0);
      }
    } else {
      const newText = form.responseText + code;
      if (newText.length <= MAX_RESPONSE_LENGTH) dispatch(setResponseText(newText));
    }
  };

  const handleSubmit = async () => {
    const cmd = normalizeCommand(form.command);
    if (!cmd) return;

    try {
      if (commandActionType === 'MESSAGE') {
        if (!form.responseText.trim()) return;

        const baseUrl = API_BASE_URL.replace('/api', '');
        const mediaUrls: string[] = [];

        for (const mediaFile of limitedMediaFiles) {
          if (mediaFile.url) {
            mediaUrls.push(mediaFile.url);
          } else if (mediaFile.file) {
            const uploaded = await uploadMediaFile(mediaFile.file);
            const url = uploaded.url.startsWith('http') ? uploaded.url : `${baseUrl}${uploaded.url}`;
            mediaUrls.push(url);
          }
        }

        const hasVideoFile = limitedMediaFiles.some((f) => f.type === 'video');
        const data: Record<string, unknown> = {
          command: cmd,
          description: null,
          action_type: 'MESSAGE',
          claim_target: undefined,
          claim_channel_ids: undefined,
          response_text: form.responseText.trim(),
          response_media_url: mediaUrls[0] || undefined,
          response_media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
          response_media_type:
            mediaUrls.length > 0
              ? hasVideoFile
                ? 'VIDEO'
                : form.responseMediaType !== 'TEXT'
                  ? form.responseMediaType
                  : 'PHOTO'
              : 'TEXT',
          response_buttons: buildInlineKeyboard(inlineButtonRows),
          scope: form.scope,
          is_active: form.isActive,
        };

        if (!isEditing) data.channel_id = channelId;

        if (isEditing) {
          await dispatch(updateBotCommandThunk({ botId, commandId: form.editingId!, data })).unwrap();
          showSuccess('Команда обновлена');
        } else {
          await dispatch(createBotCommandThunk({ botId, data })).unwrap();
          showSuccess('Команда создана');
        }

        handleClearMedia();
        resetInlineButtons();
        return;
      }

      // CLAIM_ADMIN
      const isSpecific = claimRecipientTarget === 'SPECIFIC_CHANNEL';
      if (isSpecific && claimSelectedChannelIds.length === 0) return;

      const data: Record<string, unknown> = {
        command: cmd,
        description: null,
        action_type: 'CLAIM_ADMIN',
        claim_target: claimRecipientTarget,
        claim_channel_ids: isSpecific ? claimSelectedChannelIds : undefined,
        response_text: ' ', // Заглушка: для CLAIM_ADMIN текст ответа не используется.
        response_media_url: undefined,
        response_media_urls: undefined,
        response_media_type: undefined,
        response_buttons: undefined,
        scope: form.scope,
        is_active: form.isActive,
      };

      if (!isEditing) data.channel_id = channelId;

      if (isEditing) {
        await dispatch(updateBotCommandThunk({ botId, commandId: form.editingId!, data })).unwrap();
        showSuccess('Команда обновлена');
      } else {
        await dispatch(createBotCommandThunk({ botId, data })).unwrap();
        showSuccess('Команда создана');
      }

      handleClearMedia();
      resetInlineButtons();
    } catch {
      showError(isEditing ? 'Ошибка обновления' : 'Ошибка создания');
      dispatch(setIsSubmitting(false));
    }
  };

  const isSubmitDisabled =
    form.isSubmitting ||
    !normalizeCommand(form.command) ||
    (commandActionType === 'MESSAGE'
      ? !form.responseText.trim() || isUploadingMedia
      : commandActionType === 'CLAIM_ADMIN'
        ? claimRecipientTarget === 'SPECIFIC_CHANNEL' && claimSelectedChannelIds.length === 0
        : true);

  const previewInlineKeyboard: InlineKeyboardPreviewData | undefined =
    inlineButtonRows.length > 0
      ? {
          buttons: inlineButtonRows
            .map((row) => row.buttons.filter((b) => b.text?.trim()).map((b) => ({ text: b.text, type: b.type })))
            .filter((row) => row.length > 0),
        }
      : undefined;

  return (
    <>
      <ModalBase isOpen={form.isOpen} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <ModalBase.Content size="xl" className={styles.modal}>
          <ModalBase.Header className={styles.header}>
            <div className={styles.headerStart}>
              <button type="button" className={styles.backBtn} onClick={handleClose} aria-label="Назад">
                <ChevronDownIcon width={14} height={14} color="#000000" className={styles.backChevron} />
              </button>
              <span className={styles.titleText}>
                {isEditing ? 'Редактирование команды' : 'Создание команды'}
              </span>
            </div>
            <ModalBase.Close className={styles.headerClose} />
          </ModalBase.Header>

          <ModalBase.Body className={styles.body}>
            <div className={styles.desktopLayout}>
              <div className={styles.leftColumn}>
                <div className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>Название команды</span>
                  <Input
                    placeholder="/rules"
                    value={form.command}
                    onChange={(v) => dispatch(setCommand(v))}
                    className={styles.commandInput}
                  />
                </div>

                <div className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>Срабатывать:</span>
                  <div className={styles.checkboxStack}>
                    <label className={styles.checkboxRow}>
                      <Checkbox checked={inGroup} onChange={(v) => applyScopeCheckboxes(v, inPrivate)} />
                      <span className={styles.checkboxCaption}>В группе</span>
                    </label>
                    <label className={styles.checkboxRow}>
                      <Checkbox checked={inPrivate} onChange={(v) => applyScopeCheckboxes(inGroup, v)} />
                      <span className={styles.checkboxCaption}>В личных сообщениях</span>
                    </label>
                  </div>
                </div>

                <div className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>Тип команды:</span>
                  <div className={styles.typeList}>
                    <label className={styles.radioRow}>
                      <Checkbox
                        variant="radio"
                        checked={commandActionType === 'MESSAGE'}
                        onChange={(checked) => {
                          if (checked) setCommandActionType('MESSAGE');
                        }}
                      />
                      <span className={styles.radioCaption}>Отправить сообщение</span>
                    </label>

                    <label className={styles.radioRow}>
                      <Checkbox
                        variant="radio"
                        checked={commandActionType === 'CLAIM_ADMIN'}
                        onChange={(checked) => {
                          if (checked) setCommandActionType('CLAIM_ADMIN');
                        }}
                      />
                      <span className={styles.radioCaption}>Отправить жалобу администратору</span>
                    </label>

                    {/* Третий вариант (модераторское действие) пока не используем — его в макете нет для этой логики. */}
                  </div>
                </div>
              </div>

              <div className={styles.rightColumn}>
                {commandActionType === 'MESSAGE' ? (
                  <>
                    <div className={styles.responseSection}>
                      <div className={styles.responseLabelRow}>
                        <span className={styles.responseLabel}>Текст ответа</span>
                        <button
                          type="button"
                          className={`${styles.previewBtn} ${previewOpen ? styles.previewBtnActive : ''}`}
                          title="Предпросмотр"
                          onClick={() => setPreviewOpen(true)}
                        >
                          <EyeIcon width={16} height={16} color="currentColor" />
                        </button>
                      </div>

                      <div className={styles.textareaWrapper}>
                        <textarea
                          ref={textareaRef}
                          className={styles.textarea}
                          placeholder="Введите текст ответа"
                          value={form.responseText}
                          onChange={(e) => {
                            if (e.target.value.length <= MAX_RESPONSE_LENGTH) {
                              dispatch(setResponseText(e.target.value));
                            }
                          }}
                        />
                        <div className={styles.charCounter}>
                          {form.responseText.length}/{MAX_RESPONSE_LENGTH}
                        </div>
                      </div>

                      <div className={styles.shortcodesRow}>
                        <span className={styles.shortcodesLabelInline}>Доступные шорткоды:</span>
                        <div className={styles.shortcodeChips}>
                          {SHORTCODES.map((sc) => (
                            <button
                              key={sc.code}
                              type="button"
                              className={styles.shortcodeChip}
                              onClick={() => handleInsertShortcode(sc.code)}
                            >
                              {sc.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <button
                        type="button"
                        className={`${styles.inlineButtonsRow} ${inlineButtonsOpen ? styles.inlineButtonsRowActive : ''}`}
                        onClick={handleToggleInlineButtons}
                      >
                        <InlineButtonIcon width={24} height={24} color="#000000" />
                        <span className={styles.inlineButtonsLabel}>Кнопки</span>
                      </button>
                      {inlineButtonsOpen && (
                        <div className={styles.inlineButtonsContent}>
                          <InlineButtons
                            isOpen={inlineButtonsOpen}
                            rows={inlineButtonRows}
                            onAddRow={addInlineButtonRow}
                            onAddColumn={addInlineButtonColumn}
                            onUpdateButton={updateInlineButton}
                            onDeleteButton={deleteInlineButton}
                          />
                        </div>
                      )}
                    </div>

                    <div className={styles.mediaSection}>
                      <span className={styles.mediaLabel}>Медиа и файлы</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                        multiple
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <div className={styles.mediaDropzone}>
                        {limitedMediaFiles.length === 0 ? (
                          <>
                            <span className={styles.mediaDropzoneText}>
                              Перетащите сюда фото, видео и другие файлы или нажмите «Прикрепить файл»
                            </span>
                            <OldButton
                              text={isUploadingMedia ? 'Загрузка...' : 'Прикрепить файл'}
                              variant="templateCardInternal"
                              showArrow={false}
                              icon={<PaperclipIcon width={24} height={24} />}
                              disabled={!canAddMedia || isUploadingMedia}
                              onClick={() => fileInputRef.current?.click()}
                            />
                          </>
                        ) : (
                          <div className={styles.mediaDropzoneContent}>
                            <MediaPreview
                              files={limitedMediaFiles}
                              onRemove={handleRemoveFile}
                              onToggleBlur={handleToggleBlur}
                              onMove={handleMoveMedia}
                            />
                            <OldButton
                              text={isUploadingMedia ? 'Загрузка...' : 'Прикрепить ещё'}
                              variant="templateCardInternal"
                              showArrow={false}
                              icon={<PaperclipIcon width={24} height={24} />}
                              disabled={!canAddMedia || isUploadingMedia}
                              onClick={() => fileInputRef.current?.click()}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : commandActionType === 'CLAIM_ADMIN' ? (
                  <div className={styles.claimRecipientSection}>
                    <div className={styles.claimRecipientHeading}>Получатель:</div>

                    <div className={styles.claimRecipientPanel}>
                      <div className={styles.claimList} aria-label="Получатели жалобы">
                        <label className={styles.claimItem}>
                          <Checkbox
                            variant="radio"
                            checked={claimRecipientTarget === 'ADMINS'}
                            onChange={(checked) => {
                              if (checked) setClaimRecipientTarget('ADMINS');
                            }}
                          />
                          <span className={styles.claimItemLabel}>Все администраторы</span>
                        </label>

                        <label className={styles.claimItem}>
                          <Checkbox
                            variant="radio"
                            checked={claimRecipientTarget === 'INBOX'}
                            onChange={(checked) => {
                              if (checked) setClaimRecipientTarget('INBOX');
                            }}
                          />
                          <span className={styles.claimItemLabel}>В Inbox</span>
                        </label>

                        <label className={styles.claimItem}>
                          <Checkbox
                            variant="radio"
                            checked={claimRecipientTarget === 'SPECIFIC_CHANNEL'}
                            onChange={(checked) => {
                              if (checked) setClaimRecipientTarget('SPECIFIC_CHANNEL');
                            }}
                          />
                          <span className={styles.claimItemLabel}>В конкретный канал</span>
                        </label>
                      </div>

                      {claimRecipientTarget === 'SPECIFIC_CHANNEL' && (
                        <>
                          <div className={styles.claimSearchRow}>
                            <SearchBar
                              placeholder="Введите название канала"
                              value={claimSearch}
                              onChange={setClaimSearch}
                            />
                          </div>

                          <div className={styles.claimChannelList} aria-label="Список каналов">
                            {(
                              claimSearch.trim()
                                ? claimChannels.filter((c) =>
                                    c.title.toLowerCase().includes(claimSearch.trim().toLowerCase()),
                                  )
                                : claimChannels
                            ).length === 0 ? (
                              <div className={styles.claimEmpty}>Каналы не найдены</div>
                            ) : (
                              (
                                claimSearch.trim()
                                  ? claimChannels.filter((c) =>
                                      c.title.toLowerCase().includes(claimSearch.trim().toLowerCase()),
                                    )
                                  : claimChannels
                              ).map((ch) => {
                                const checked = claimSelectedChannelIds.includes(ch.id);
                                return (
                                  <label key={ch.id} className={styles.claimChannelItem}>
                                    <Checkbox
                                      checked={checked}
                                      onChange={(next) => {
                                        setClaimSelectedChannelIds((prev) => {
                                          if (next) {
                                            return prev.includes(ch.id) ? prev : [...prev, ch.id];
                                          }
                                          return prev.filter((id) => id !== ch.id);
                                        });
                                      }}
                                    />
                                    <span className={styles.claimChannelLabel}>{ch.title}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}

                      {claimRecipientTarget === 'SPECIFIC_CHANNEL' && (
                        <div className={styles.claimAddRow}>
                          <Button
                            variant="outline"
                            intent="gradient"
                            size="md"
                            className={styles.claimAddBtn}
                            onClick={() => setConnectModalOpen(true)}
                          >
                            Подключить новый
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.moderationPlaceholder}>
                    Системные команды настраиваются в разделе «Модерация»
                  </div>
                )}
              </div>
            </div>

            <div className={styles.footer}>
              <Button variant="outline" intent="gradient" size="lg" className={styles.cancelBtn} onClick={handleClose}>
                Отменить
              </Button>
              <Button
                variant="fill"
                intent="gradient"
                size="lg"
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                loading={form.isSubmitting}
              >
                Сохранить
              </Button>
            </div>
          </ModalBase.Body>
        </ModalBase.Content>
      </ModalBase>

      <PostPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        channelTitle={channelTitle}
        html={renderPreview(form.responseText)}
        mediaFiles={limitedMediaFiles}
        inlineKeyboard={previewInlineKeyboard}
      />

      <ChannelsConnectModal isOpen={connectModalOpen} onOpenChange={setConnectModalOpen} />
    </>
  );
};

export default CreateBotCommandModal;
