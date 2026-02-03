interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function FlagGb({ className, width = 20, height = 14 }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="14" fill="#012169" />
      <rect x="8" width="4" height="14" fill="#FFFFFF" />
      <rect y="5" width="20" height="4" fill="#FFFFFF" />
      <rect x="9" width="2" height="14" fill="#C8102E" />
      <rect y="6" width="20" height="2" fill="#C8102E" />
    </svg>
  );
}
