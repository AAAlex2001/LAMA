interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function BurgerIcon({ className, width = 44, height = 44, color = '#000000' }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13 16H31M13 22H31M13 28H31"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
