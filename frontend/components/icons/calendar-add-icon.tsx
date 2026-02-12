interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function CalendarAddIcon({ className, width = 16, height = 16, color = '#3B82F6' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M8.00065 3.33203V12.6654M3.33398 7.9987H12.6673"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
