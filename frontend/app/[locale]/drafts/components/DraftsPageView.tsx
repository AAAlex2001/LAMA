'use client';

import { useState } from 'react';
import Loader from '@/components/loader';
import DraftsHeader from './drafts-header';
import DraftsList from './DraftsList';
import DraftsDialogs from './DraftsDialogs';
import ShareDraftLinkModal from './share-modals/ShareDraftLinkModal';
import SharedDraftReceivedModal from './share-modals/SharedDraftReceivedModal';
import ExpiredLinkModal from './share-modals/ExpiredLinkModal';
import { useDraftsPage } from '../hooks/useDraftsPage';
import { useSharedDraftFromUrl } from '../hooks/useSharedDraftFromUrl';
import styles from '../drafts.module.scss';

export default function DraftsPageView() {
  const [previewingFromShared, setPreviewingFromShared] = useState(false);
  const [showSharedModal, setShowSharedModal] = useState(true);

  const {
    token: sharedToken,
    setToken: setSharedToken,
    draft: sharedDraft,
    isExpired,
  } = useSharedDraftFromUrl();

  const {
    drafts,
    isLoading,
    isLoadingMore,
    deleteConfirmDraft,
    setDeleteConfirmDraft,
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
            onPreview={setPreviewDraft}
            onShare={handleShare}
            onDelete={setDeleteConfirmDraft}
            onEdit={handleEdit}
          />
        )}
      </div>

      <DraftsDialogs
        deleteConfirmId={deleteConfirmDraft?.id ?? null}
        onCloseDelete={() => setDeleteConfirmDraft(null)}
        onConfirmDelete={confirmDelete}
        previewData={previewData}
        isPreviewOpen={!!previewDraft}
        onClosePreview={() => {
          setPreviewDraft(null);
          if (previewingFromShared) {
            setPreviewingFromShared(false);
            setShowSharedModal(true);
          }
        }}
        token={token}
      />

      <div className={styles.bottomGradient} />

      <ShareDraftLinkModal draft={shareDraft} onClose={() => setShareDraft(null)} />

      <SharedDraftReceivedModal
        isOpen={!!sharedDraft && showSharedModal}
        draft={sharedDraft}
        token={sharedToken}
        onClose={() => {
          setShowSharedModal(false);
          setSharedToken(null);
        }}
        onPreview={() => {
          if (sharedDraft) {
            setPreviewingFromShared(true);
            setShowSharedModal(false);
            setPreviewDraft(sharedDraft);
          }
        }}
      />

      <ExpiredLinkModal isOpen={isExpired} onClose={() => setSharedToken(null)} />
    </div>
  );
}
