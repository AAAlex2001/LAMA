import { useRef, useSyncExternalStore } from 'react';
import { MediaFile } from './media-preview';

interface PointerDragState {
  pointerId: number;
  sourceId: string | null;
  startX: number;
  startY: number;
  active: boolean;
  didMove: boolean;
}

interface DragGhostState {
  visible: boolean;
  x: number;
  y: number;
  file: MediaFile | null;
}

interface LightboxState {
  isOpen: boolean;
  media: MediaFile | null;
  url: string;
  loading: boolean;
}

interface MediaPreviewState {
  loadedImages: Set<string>;
  draggingId: string | null;
  dragOverId: string | null;
  dragGhost: DragGhostState;
  lightbox: LightboxState;
  pointerDrag: PointerDragState;
  suppressClick: boolean;
}

interface MediaPreviewActions {
  // Image loading
  markImageLoaded: (id: string) => void;

  // Drag & Drop (HTML5)
  handleDragStart: (e: React.DragEvent, fileId: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent, fileId: string) => void;
  handleDragLeave: (fileId: string) => void;
  handleDrop: (e: React.DragEvent, targetId: string, onMove: (from: string, to: string) => void) => void;

  // Pointer drag (touch/swipe)
  handlePointerDown: (e: React.PointerEvent, fileId: string, files: MediaFile[]) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  finishPointerDrag: (e: React.PointerEvent, onMove: (from: string, to: string) => void) => void;

  // Lightbox
  openLightbox: (file: MediaFile) => void;
  closeLightbox: () => void;
  setLightboxLoaded: () => void;

  // Helpers
  getPreviewUrl: (file: MediaFile) => string;
  shouldSuppressClick: () => boolean;
}

export type MediaPreviewStore = MediaPreviewState & MediaPreviewActions;

const initialPointerDrag: PointerDragState = {
  pointerId: -1,
  sourceId: null,
  startX: 0,
  startY: 0,
  active: false,
  didMove: false,
};

const initialDragGhost: DragGhostState = {
  visible: false,
  x: 0,
  y: 0,
  file: null,
};

const initialLightbox: LightboxState = {
  isOpen: false,
  media: null,
  url: '',
  loading: false,
};

const initialState: MediaPreviewState = {
  loadedImages: new Set(),
  draggingId: null,
  dragOverId: null,
  dragGhost: initialDragGhost,
  lightbox: initialLightbox,
  pointerDrag: initialPointerDrag,
  suppressClick: false,
};

function createStore() {
  let state = { ...initialState };
  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState = (partial: Partial<MediaPreviewState>) => {
    state = { ...state, ...partial };
    listeners.forEach(listener => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // Actions
  const markImageLoaded = (id: string) => {
    const newSet = new Set(state.loadedImages);
    newSet.add(id);
    setState({ loadedImages: newSet });
  };

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fileId);
    setState({ draggingId: fileId });
  };

  const handleDragEnd = () => {
    setState({ draggingId: null, dragOverId: null });
  };

  const handleDragOver = (e: React.DragEvent, fileId: string) => {
    e.preventDefault();
    if (state.dragOverId !== fileId) {
      setState({ dragOverId: fileId });
    }
  };

  const handleDragLeave = (fileId: string) => {
    if (state.dragOverId === fileId) {
      setState({ dragOverId: null });
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    targetId: string,
    onMove: (from: string, to: string) => void
  ) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetId) {
      onMove(sourceId, targetId);
    }
    setState({ draggingId: null, dragOverId: null });
  };

  const handlePointerDown = (e: React.PointerEvent, fileId: string, files: MediaFile[]) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    // Skip if clicking on controls
    if (target?.closest('[data-controls]')) return;
    
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    
    const file = files.find(f => f.id === fileId) || null;
    
    setState({
      pointerDrag: {
        pointerId: e.pointerId,
        sourceId: fileId,
        startX: e.clientX,
        startY: e.clientY,
        active: true,
        didMove: false,
      },
      draggingId: fileId,
      dragOverId: fileId,
      dragGhost: {
        visible: false,
        x: e.clientX,
        y: e.clientY,
        file,
      },
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = state.pointerDrag;
    if (!drag.active || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.didMove && Math.hypot(dx, dy) < 4) return;

    const newPointerDrag = { ...drag, didMove: true };

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const item = el?.closest('[data-media-id]') as HTMLElement | null;
    const targetId = item?.dataset.mediaId || null;

    setState({
      pointerDrag: newPointerDrag,
      dragOverId: targetId && targetId !== state.dragOverId ? targetId : state.dragOverId,
      dragGhost: {
        ...state.dragGhost,
        visible: true,
        x: e.clientX,
        y: e.clientY,
      },
    });
  };

  const finishPointerDrag = (
    e: React.PointerEvent,
    onMove: (from: string, to: string) => void
  ) => {
    const drag = state.pointerDrag;
    if (!drag.active || drag.pointerId !== e.pointerId) return;
    
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const sourceId = drag.sourceId;
    const targetId = state.dragOverId;

    if (drag.didMove) {
      setState({ suppressClick: true });
      requestAnimationFrame(() => {
        setState({ suppressClick: false });
      });
    }

    if (sourceId && targetId && sourceId !== targetId) {
      onMove(sourceId, targetId);
    }

    setState({
      pointerDrag: initialPointerDrag,
      draggingId: null,
      dragOverId: null,
      dragGhost: initialDragGhost,
    });
  };

  const openLightbox = (file: MediaFile) => {
    let fullUrl = '';
    if (file.file) {
      fullUrl = URL.createObjectURL(file.file);
    } else {
      fullUrl = file.url || file.preview_url || file.thumbnail_url || '';
    }

    if (!fullUrl) return;

    setState({
      lightbox: {
        isOpen: true,
        media: file,
        url: fullUrl,
        loading: true,
      },
    });
  };

  const closeLightbox = () => {
    const { lightbox } = state;
    if (lightbox.media?.file && lightbox.url.startsWith('blob:')) {
      URL.revokeObjectURL(lightbox.url);
    }
    setState({ lightbox: initialLightbox });
  };

  const setLightboxLoaded = () => {
    setState({
      lightbox: { ...state.lightbox, loading: false },
    });
  };

  const getPreviewUrl = (file: MediaFile): string => {
    if (file.type === 'video') {
      return file.thumbnail_url || '';
    }
    return file.thumbnail_url || file.preview_url || file.url || '';
  };

  const shouldSuppressClick = () => state.suppressClick;

  return {
    getState,
    subscribe,
    actions: {
      markImageLoaded,
      handleDragStart,
      handleDragEnd,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handlePointerDown,
      handlePointerMove,
      finishPointerDrag,
      openLightbox,
      closeLightbox,
      setLightboxLoaded,
      getPreviewUrl,
      shouldSuppressClick,
    },
  };
}

export function useMediaPreviewStore(): MediaPreviewStore {
  const storeRef = useRef<ReturnType<typeof createStore> | null>(null);
  
  if (!storeRef.current) {
    storeRef.current = createStore();
  }
  
  const store = storeRef.current;

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  );

  return {
    ...state,
    ...store.actions,
  };
}
