interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function GifIcon({ width = 16, height = 16, color = '#B0B4B8' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.25" stroke={color} strokeWidth="1.5" />
      <path d="M5.5 6.5H4.25C3.83579 6.5 3.5 6.83579 3.5 7.25V8.75C3.5 9.16421 3.83579 9.5 4.25 9.5H5.5V8.25H4.75" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 6.5V9.5" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <path d="M9.5 6.5V9.5M9.5 6.5H12M9.5 8H11.25" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
