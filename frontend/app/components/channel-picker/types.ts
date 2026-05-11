export interface ChannelOption {
  id: string;
  label: string;
  checked?: boolean;
  members_count?: number;
  photo_url?: string;
}

export interface ChannelsContentProps {
  options: ChannelOption[];
  showSearch: boolean;
  showCheckboxes: boolean;
  placeholder: string;
  loading: boolean;
  selectedCount?: number;
  totalCount?: number;
  addNewLabel: string;
  onOptionChange?: (id: string, checked: boolean) => void;
  onAddNew?: () => void;
}
