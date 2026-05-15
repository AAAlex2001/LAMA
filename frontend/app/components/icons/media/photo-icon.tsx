interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function PhotoIcon({ width = 16, height = 16, color = '#B0B4B8' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.25" stroke={color} strokeWidth="1.5" />
      <circle cx="5" cy="6" r="1.25" stroke={color} strokeWidth="1.5" />
      <path d="M1.75 10.5L4.75 7.5L7.25 10L10.25 6.5L14.25 10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
