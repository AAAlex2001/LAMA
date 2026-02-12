interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function CalendarSidebarPostIcon({ className, width = 16, height = 16, color = '#3B82F6' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M4.33 2H11.67C12.4 2 13 2.6 13 3.33V14L8 11.5L3 14V3.33C3 2.6 3.6 2 4.33 2Z" fill={color} />
    </svg>
  );
}
