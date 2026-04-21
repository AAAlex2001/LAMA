import { MouseEvent, KeyboardEvent, PointerEvent as ReactPointerEvent, useRef } from "react";
import type { CheckedItemsAction } from "../../../hooks/useCheckedItems";

interface UseRowInteractionParams {
  itemId: string;
  isSelectionMode: boolean;
  selectionDispatch?: React.Dispatch<CheckedItemsAction>;
}

interface UseRowInteractionReturn {
  handleRowClick: (e: MouseEvent) => void;
  handleRowPointerUp: (e: ReactPointerEvent) => void;
  handleRowKeyDown: (e: KeyboardEvent) => void;
  handleCheck: () => void;
  handleHold: () => void;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return Boolean(
    el.closest(
      'button, a, input, textarea, select, label, [role="button"], [role="link"], [data-prevent-row-toggle]',
    ),
  );
}

export function useRowInteraction({
  itemId,
  isSelectionMode,
  selectionDispatch,
}: UseRowInteractionParams): UseRowInteractionReturn {
  const toggledByPointerRef = useRef(false);

  const handleCheck = () => {
    selectionDispatch?.({ type: "toggle", id: itemId });
  };

  const handleHold = () => {
    selectionDispatch?.({ type: "holdSelect", id: itemId });
  };

  const handleRowClick = (e: MouseEvent) => {
    if (!isSelectionMode) return;
    if (toggledByPointerRef.current) {
      toggledByPointerRef.current = false;
      return;
    }
    if (isInteractiveTarget(e.target)) return;
    handleCheck();
  };

  const handleRowPointerUp = (e: ReactPointerEvent) => {
    if (!isSelectionMode) return;
    if (isInteractiveTarget(e.target)) return;
    toggledByPointerRef.current = true;
    handleCheck();
  };

  const handleRowKeyDown = (e: KeyboardEvent) => {
    if (!isSelectionMode) return;
    if (isInteractiveTarget(e.target)) return;
    handleCheck();
  };

  return {
    handleRowClick,
    handleRowPointerUp,
    handleRowKeyDown,
    handleCheck,
    handleHold,
  };
}
