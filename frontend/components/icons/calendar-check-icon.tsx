interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function CalendarCheckIcon({ className, width = 16, height = 16, color = '#34C759' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M2 8.5L5.5 12L14 3.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
