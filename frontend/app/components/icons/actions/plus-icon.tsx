interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function PlusIcon({ className, width = 16, height = 16, color = '#000000' }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8 2V14M2 8H14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
