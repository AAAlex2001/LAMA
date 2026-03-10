import { useRef, useEffect } from "react";

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

  const clear = (shouldCancel = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (shouldCancel && isActiveRef.current && !didFireRef.current) {
      onHoldCancel?.();
    }
    isActiveRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const start = (x: number, y: number) => {
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
      onHoldCancel?.();
    }, duration);
  };

  const move = (x: number, y: number) => {
      if (!startPosRef.current) return;
      const dx = Math.abs(x - startPosRef.current.x);
      const dy = Math.abs(y - startPosRef.current.y);
      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
        startPosRef.current = null;
    }
  };

  const end = () => {
    const fired = didFireRef.current;
    clear();
    startPosRef.current = null;

    if (!fired) {
      onPress?.();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  };

  const onTouchEnd = () => end();

  const onMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      start(e.clientX, e.clientY);
    };

  const onMouseMove = (e: React.MouseEvent) => {
    move(e.clientX, e.clientY);
  };

  const onMouseUp = () => end();

  const onMouseLeave = () => {
    clear();
    startPosRef.current = null;
  };

  const onContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    if (isActiveRef.current || didFireRef.current) {
      e.preventDefault();
    }
  };

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
