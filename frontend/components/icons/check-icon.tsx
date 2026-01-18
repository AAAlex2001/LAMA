interface CheckIconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function CheckIcon({ width = 16, height = 16, color = '#000000' }: CheckIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points="13 24 4 15 5.414 13.586 13 21.171 26.586 7.586 28 9 13 24"
        fill={color}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect width="32" height="32" fill="none" />
    </svg>
  );
}
