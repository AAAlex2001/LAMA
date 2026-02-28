import { useRef, useCallback, useEffect } from "react";

interface UseLongPressOptions {
  duration?: number;
  moveThreshold?: number;
  onLongPress: () => void;
  onPress?: () => void;
  onHoldStart?: () => void;
  onHoldCancel?: () => void;
}

export function useLongPress({
  duration = 2000,
  moveThreshold = 10,
  onLongPress,
  onPress,
  onHoldStart,
  onHoldCancel,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const didFireRef = useRef(false);
  const isActiveRef = useRef(false);

  const clear = useCallback((shouldCancel = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (shouldCancel && isActiveRef.current && !didFireRef.current) {
      onHoldCancel?.();
    }
    isActiveRef.current = false;
  }, [onHoldCancel]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const start = useCallback(
    (x: number, y: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      didFireRef.current = false;
      isActiveRef.current = true;
      startPosRef.current = { x, y };
      onHoldStart?.();

      timerRef.current = setTimeout(() => {
        didFireRef.current = true;
        timerRef.current = null;
        isActiveRef.current = false;
        onLongPress();
        // Clear the holding state after long press completes
        onHoldCancel?.();
      }, duration);
    },
    [duration, onLongPress, onHoldStart, onHoldCancel],
  );

  const move = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current) return;
      const dx = Math.abs(x - startPosRef.current.x);
      const dy = Math.abs(y - startPosRef.current.y);
      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
        startPosRef.current = null;
      }
    },
    [moveThreshold, clear],
  );

  const end = useCallback(() => {
    const fired = didFireRef.current;
    clear();
    startPosRef.current = null;

    if (!fired) {
      onPress?.();
    }
  }, [clear, onPress]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    },
    [start],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    },
    [move],
  );

  const onTouchEnd = useCallback(() => end(), [end]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      start(e.clientX, e.clientY);
    },
    [start],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      move(e.clientX, e.clientY);
    },
    [move],
  );

  const onMouseUp = useCallback(() => end(), [end]);

  const onMouseLeave = useCallback(() => {
    clear();
    startPosRef.current = null;
  }, [clear]);

  const onContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isActiveRef.current || didFireRef.current) {
      e.preventDefault();
    }
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onContextMenu,
  };
}
