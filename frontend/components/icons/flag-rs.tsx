interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function FlagRs({ className, width = 20, height = 14 }: IconProps) {
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
      <rect width="20" height="14" fill="#FFFFFF" />
      <rect width="20" height="4.6667" fill="#C6363C" />
      <rect y="4.6667" width="20" height="4.6667" fill="#0C4076" />
    </svg>
  );
}
