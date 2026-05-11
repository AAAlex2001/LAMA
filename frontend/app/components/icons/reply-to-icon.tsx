interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function ReplyToIcon({
  className,
  width = 24,
  height = 24,
  color = 'currentColor',
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
      <path d="m9 17-5-5 5-5" />
    </svg>
  );
}

