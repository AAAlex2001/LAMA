interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function ShortcodesIcon({ width = 24, height = 24, color = '#383F45' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.85714 4.28613H3V19.7147H6.85714M17.1429 4.28613H21V19.7147H17.1429" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13.9275 3L10.0703 21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
