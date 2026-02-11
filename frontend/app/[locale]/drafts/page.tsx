'use client';

import React from 'react';
import { DraftsProvider } from './store/provider';
import { AppLayout } from '@/components/app-layout';
import Loader from '@/components/loader';
import Modal from '@/components/modal';
import Input from '@/components/input/input';
import { CopyIcon, TelegramCircleIcon } from '@/components/icons';
import DraftsHeader from './components/DraftsHeader';
import DraftsList from './components/DraftsList';
import DraftsDialogs from './components/DraftsDialogs';
import { useDraftsPage } from './hooks/useDraftsPage';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import styles from './drafts.module.scss';

function DraftsPageContent() {
  const { showSuccess } = useNotifications();
  const [shareLink, setShareLink] = React.useState('');
  
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
    handleShare,
    handleEdit,
    confirmDelete,
    previewData,
    shareDraft,
    setShareDraft,
    defaultSortByDate,
    defaultSortBySource,
  } = useDraftsPage();

  React.useEffect(() => {
    if (!shareDraft) {
      setShareLink('');
      return;
    }

    const generateTokenAndGetLink = async () => {
      try {
        const token = localStorage.getItem('lamaplanner_access_token');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/publications/${shareDraft.id}/share`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/edit-draft?token=${data.share_token}`;
        setShareLink(link);
      } catch {
        setShareLink('');
      }
    };

    generateTokenAndGetLink();
  }, [shareDraft]);

  return (
    <div className={styles.page} ref={scrollRef}>
      {showPageLoader && (
        <div className={styles.pageLoader}>
          <Loader size={32} color="blue" />
        </div>
      )}
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

        <DraftsList
          drafts={drafts}
          showInlineLoader={!showPageLoader && (isLoading || isLoadingMore)}
          onPreview={(draft) => setPreviewDraft(draft)}
          onShare={handleShare}
          onDelete={(draft) => setDeleteConfirmId(draft.id)}
          onEdit={handleEdit}
        />
      </div>

      <DraftsDialogs
        deleteConfirmId={deleteConfirmId}
        onCloseDelete={() => setDeleteConfirmId(null)}
        onConfirmDelete={confirmDelete}
        previewData={previewData}
        isPreviewOpen={!!previewDraft}
        onClosePreview={() => setPreviewDraft(null)}
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
              <Input
                value={shareLink}
                onChange={() => {}}
                variant="white"
                className={styles.shareLinkInput}
                icon={<CopyIcon width={24} height={24} color="#383F45" />}
                onIconClick={() => {
                  if (shareLink) {
                    navigator.clipboard.writeText(shareLink);
                    showSuccess('Ссылка скопирована!');
                  }
                }}
              />
              <button
                type="button"
                className={styles.telegramBtn}
                onClick={() => {
                  if (shareLink) {
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}`, '_blank');
                  }
                }}
              >
                <TelegramCircleIcon width={32} height={32} color="#1E1E1E" />
              </button>
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
