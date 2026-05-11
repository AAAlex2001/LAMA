import type { InboxEventResponse, InboxActionType } from '@/store/inbox';
import type { BlockStatus } from "../hooks/useInboxEventActions";

export interface ActionGroupProps {
  item: InboxEventResponse;
  blockStatus: BlockStatus | null;
  loadingAction: InboxActionType | null;
  handleAction: (actionType: InboxActionType, payload?: Record<string, unknown>) => void;
  setIsBlockModalOpen: (v: boolean) => void;
  isMobile?: boolean;
}

export function getButtonStyleVars(isMobile?: boolean): {
  btnWidth: string;
} {
  return {
    btnWidth: isMobile ? '100%' : '150px',
  };
}
