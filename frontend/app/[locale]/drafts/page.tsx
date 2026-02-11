'use client';

import { DraftsProvider } from './store/provider';
import { AppLayout } from '@/components/app-layout';
import Loader from '@/components/loader';
import DraftsHeader from './components/DraftsHeader';
import DraftsList from './components/DraftsList';
import DraftsDialogs from './components/DraftsDialogs';
import { useDraftsPage } from './hooks/useDraftsPage';
import styles from './drafts.module.scss';

function DraftsPageContent() {
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
    defaultSortByDate,
    defaultSortBySource,
  } = useDraftsPage();

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
