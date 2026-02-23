'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DraftsProvider } from './store/provider';
import { AppLayout } from '@/components/app-layout';
import Loader from '@/components/loader';
import Modal from '@/components/modal';
import Input from '@/components/input/input';
import Button from '@/components/button/button';
import { CopyIcon, TelegramCircleIcon } from '@/components/icons';
import DraftsHeader from './components/DraftsHeader';
import DraftsList from './components/DraftsList';
import DraftsDialogs from './components/DraftsDialogs';
import { useDraftsPage } from './hooks/useDraftsPage';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import SharedDraftModal from '@/components/shared-draft-modal/shared-draft-modal';
import styles from './drafts.module.scss';

function DraftsPageContent() {
  const { showSuccess, showError } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shareLink, setShareLink] = React.useState('');
  const [isGeneratingShareLink, setIsGeneratingShareLink] = React.useState(false);
  const [sharedToken, setSharedToken] = React.useState<string | null>(null);
  const [sharedDraft, setSharedDraft] = React.useState<any | null>(null);
  const [showSharedDraftModal, setShowSharedDraftModal] = React.useState(false);
  const [showExpiredLinkModal, setShowExpiredLinkModal] = React.useState(false);
  const [previewingFromShared, setPreviewingFromShared] = React.useState(false);

  const {
    drafts,
    isLoading,
    isLoadingMore,
    deleteConfirmId,
    setDeleteConfirmId,
    previewDraft,
    setPreviewDraft,
    openSort,
    setOpenSort,
    sortByDate,
    setSortByDate,
    selectedTagIds,
    setSelectedTagIds,
    sortBySource,
    setSortBySource,
    mobileFilterOpen,
    setMobileFilterOpen,
    scrollRef,
    sortBarRef,
    mobileFilterRef,
    dateOptions,
    sourceOptions,
    tagOptions,
    isDateActive,
    isTagsActive,
    isSourceActive,
    tagButtonLabel,
    token,
    showPageLoader,
    isInitialDraftsLoaded,
    handleShare,
    handleEdit,
    confirmDelete,
    previewData,
    shareDraft,
    setShareDraft,
    defaultSortByDate,
    defaultSortBySource,
  } = useDraftsPage();

  function clearTokenFromUrl() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    router.replace(url.pathname + url.search, { scroll: false });
  }

  React.useEffect(() => {
    const tokenParam = searchParams?.get('token');
    if (!tokenParam) return;
    if (sharedToken === tokenParam) return;

    setSharedToken(tokenParam);
    setSharedDraft(null);
    setShowExpiredLinkModal(false);

    const fetchSharedDraft = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/shared/${tokenParam}`);
        if (!response.ok) {
          setShowExpiredLinkModal(true);
          clearTokenFromUrl();
          return;
        }
        const data = await response.json();
        setSharedDraft(data);
        setShowSharedDraftModal(true);
        clearTokenFromUrl();
      } catch {
        setShowExpiredLinkModal(true);
        clearTokenFromUrl();
      }
    };

    fetchSharedDraft();
  }, [searchParams, sharedToken]);

  async function consumeShareToken(tokenVal: string) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/shared/${tokenVal}/consume`, { method: 'POST' });
    } catch {
      // ignore
    }
  }

  async function saveSharedDraftToMyDrafts(): Promise<number | null> {
    if (!sharedDraft || !sharedToken) return null;

    const accessToken = localStorage.getItem('lamaplanner_access_token');
    if (!accessToken) {
      showError('Нужно войти в аккаунт, чтобы сохранить черновик');
      return null;
    }

    try {
      const hasMedia = sharedDraft.media_urls?.length > 0;
      const hasPoll = !!sharedDraft.poll_data?.question;
      let contentType = sharedDraft.content_type;
      if (!contentType) {
        if (hasPoll) {
          contentType = sharedDraft.poll_data?.is_quiz ? 'quiz' : 'poll';
        } else if (hasMedia) {
          contentType = 'media';
        } else {
          contentType = 'text';
        }
      }

      const payload = {
        content_type: contentType,
        text_content: sharedDraft.text_content,
        formatted_content: sharedDraft.formatted_content,
        media_urls: sharedDraft.media_urls || [],
        media_thumbnail_urls: sharedDraft.media_thumbnail_urls || [],
        media_file_ids: sharedDraft.media_file_ids || [],
        media_blur: sharedDraft.media_blur || [],
        inline_keyboard: sharedDraft.inline_keyboard,
        poll_data: sharedDraft.poll_data,
        pin_message: sharedDraft.pin_message ?? false,
        disable_notification: sharedDraft.disable_notification ?? false,
        disable_web_page_preview: sharedDraft.disable_web_page_preview ?? false,
        scheduled_time: null,
        timezone: sharedDraft.timezone,
        channel_ids: [],
        tag_names: (sharedDraft.tags || []).map((t: any) => t.name),
        tag_colors: (sharedDraft.tags || []).map((t: any) => t.color),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed');
      }

      const created = await response.json();
      const createdId = typeof created?.id === 'number' ? created.id : null;

      await consumeShareToken(sharedToken);
      showSuccess('Черновик сохранён!');
      setShowSharedDraftModal(false);

      return createdId;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка сохранения черновика');
      return null;
    }
  }

  React.useEffect(() => {
    if (!shareDraft) {
      setShareLink('');
      setIsGeneratingShareLink(false);
      return;
    }

    const generateTokenAndGetLink = async () => {
      setIsGeneratingShareLink(true);
      try {
        const accessToken = localStorage.getItem('lamaplanner_access_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/${shareDraft.id}/share`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/drafts?token=${data.share_token}`;
        setShareLink(link);
      } catch {
        setShareLink('');
      } finally {
        setIsGeneratingShareLink(false);
      }
    };

    generateTokenAndGetLink();
  }, [shareDraft]);

  return (
    <div className={styles.page} ref={scrollRef}>
      <div className={styles.container}>
        <DraftsHeader
          sortBarRef={sortBarRef}
          mobileFilterRef={mobileFilterRef}
          openSort={openSort}
          setOpenSort={setOpenSort}
          sortByDate={sortByDate}
          setSortByDate={setSortByDate}
          sortBySource={sortBySource}
          setSortBySource={setSortBySource}
          selectedTagIds={selectedTagIds}
          setSelectedTagIds={setSelectedTagIds}
          mobileFilterOpen={mobileFilterOpen}
          setMobileFilterOpen={setMobileFilterOpen}
          dateOptions={dateOptions}
          sourceOptions={sourceOptions}
          tagOptions={tagOptions}
          tagButtonLabel={tagButtonLabel}
          isDateActive={isDateActive}
          isTagsActive={isTagsActive}
          isSourceActive={isSourceActive}
          defaultSortByDate={defaultSortByDate}
          defaultSortBySource={defaultSortBySource}
        />

        {showPageLoader ? (
          <div className={styles.loaderCentered}>
            <Loader size={32} color="blue" />
          </div>
        ) : (
          <DraftsList
            drafts={drafts}
            isLoading={isLoading}
            isInitialDraftsLoaded={isInitialDraftsLoaded}
            showInlineLoader={isLoadingMore}
            hasTagFilter={selectedTagIds.length > 0}
            onPreview={(draft) => setPreviewDraft(draft)}
            onShare={handleShare}
            onDelete={(draft) => setDeleteConfirmId(draft.id)}
            onEdit={handleEdit}
          />
        )}
      </div>

      <DraftsDialogs
        deleteConfirmId={deleteConfirmId}
        onCloseDelete={() => setDeleteConfirmId(null)}
        onConfirmDelete={confirmDelete}
        previewData={previewData}
        isPreviewOpen={!!previewDraft}
        onClosePreview={() => {
          setPreviewDraft(null);
          if (previewingFromShared) {
            setPreviewingFromShared(false);
            setShowSharedDraftModal(true);
          }
        }}
        token={token}
      />

      <div className={styles.bottomGradient} />

      <div className={styles.shareModal}>
        <Modal
          isOpen={!!shareDraft}
          onClose={() => setShareDraft(null)}
          onConfirm={() => setShareDraft(null)}
          title="Поделиться черновиком"
          hideButtons
        >
          <div className={styles.shareModalContent}>
            <p className={styles.shareDescription}>
              Вы можете скопировать ссылку и отправить её удобным способом или нажать на иконку Telegram, после чего выбрать чат и поделиться ссылкой напрямую.<br /><br />
              <strong>Внимание:</strong> ссылка действительна <strong>7 дней</strong> и может быть использована <strong>только один раз</strong>.
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

      <SharedDraftModal
        isOpen={showSharedDraftModal}
        onClose={() => {
          setShowSharedDraftModal(false);
          setSharedDraft(null);
          setSharedToken(null);
        }}
        username={undefined}
        onSave={async () => {
          const id = await saveSharedDraftToMyDrafts();
          if (id) {
            window.location.href = '/drafts';
          }
        }}
        onPublish={() => {
          if (!sharedToken) return;
          setShowSharedDraftModal(false);
          window.location.href = `/edit-draft?token=${encodeURIComponent(sharedToken)}&skipSharedModal=1`;
        }}
        onPreview={() => {
          if (sharedDraft) {
            setPreviewingFromShared(true);
            setShowSharedDraftModal(false);
            setPreviewDraft(sharedDraft);
          }
        }}
      />

      <div className={styles.invalidLinkModal}>
        <Modal
          isOpen={showExpiredLinkModal}
          onClose={() => setShowExpiredLinkModal(false)}
          onConfirm={() => setShowExpiredLinkModal(false)}
          title="Ссылка недействительна"
          hideButtons
        >
          <div className={styles.shareModalContent}>
            <p className={styles.shareDescription}>
              Срок действия ссылки истёк или она уже была использована.
            </p>
            <div className={styles.shareLinkRow}>
              <Button
                text="Список черновиков"
                showArrow={false}
                onClick={() => {
                  setShowExpiredLinkModal(false);
                  window.location.href = '/drafts';
                }}
              />
              <Button
                text="Создать пост"
                showArrow={false}
                active
                className={styles.invalidCreatePostBtn}
                onClick={() => {
                  setShowExpiredLinkModal(false);
                  window.location.href = '/create-post';
                }}
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default function DraftsPage() {
  return (
    <AppLayout pageTitle="Черновики">
      <DraftsProvider>
        <DraftsPageContent />
      </DraftsProvider>
    </AppLayout>
  );
}
