interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function QuizIcon({ className, width = 24, height = 24, color = '#383F45' }: IconProps) {
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
        d="M2.5 5L4 6.5L7 3.5M2.5 12L4 13.5L7 10.5M2.5 19L4 20.5L7 17.5M10.5 12H21.5M10.5 19H21.5M10.5 5H21.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
