interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function CalendarCommentsIcon({ className, width = 12, height = 12, color = '#B0B4B8' }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6 1C8.7615 1 11 3.0935 11 5.6745C11 8.2555 8.7615 10.349 6 10.349C5.4435 10.349 4.9095 10.2655 4.4115 10.1115L2.0865 10.7095C1.97634 10.7389 1.86038 10.7388 1.75026 10.7092C1.64015 10.6796 1.53976 10.6216 1.45916 10.5409C1.37856 10.4603 1.32059 10.3599 1.29108 10.2497C1.26156 10.1396 1.26154 10.0236 1.291 9.9135L1.6155 8.6655C1.2186 8.7635 1 7.246 1 5.6745C1 3.094 3.2385 1 6 1Z"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M4 5.5H8M4 7H6.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
