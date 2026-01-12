interface BoldIconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function BoldIcon({ width = 21, height = 21, color = '#383F45' }: BoldIconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5714 11.5C12.2787 11.5 12.9569 11.2103 13.457 10.6945C13.9571 10.1788 14.2381 9.47935 14.2381 8.75C14.2381 8.02065 13.9571 7.32118 13.457 6.80546C12.9569 6.28973 12.2787 6 11.5714 6H7V11.5M11.5714 11.5H7M11.5714 11.5H12.3333C13.0406 11.5 13.7189 11.7897 14.219 12.3055C14.719 12.8212 15 13.5207 15 14.25C15 14.9793 14.719 15.6788 14.219 16.1945C13.7189 16.7103 13.0406 17 12.3333 17H7V11.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
