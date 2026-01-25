interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function EditNameIcon({ className, width = 24, height = 24, color = '#383F45' }: IconProps) {
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
        d="M14.3529 7.01425L17.1765 9.79691M12.4706 20H20M4.94118 16.2898L4 20L7.76471 19.0724L18.6692 8.32581C19.0221 7.97793 19.2203 7.50616 19.2203 7.01425C19.2203 6.52234 19.0221 6.05057 18.6692 5.70269L18.5073 5.54315C18.1543 5.19537 17.6756 5 17.1765 5C16.6773 5 16.1986 5.19537 15.8456 5.54315L4.94118 16.2898Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
