interface ArrowRightIconProps {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export default function ArrowRightIcon({
  width = 20,
  height = 20,
  color = 'currentColor',
  className,
}: ArrowRightIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
