interface IconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function AudioIcon({ width = 16, height = 16, color = '#B0B4B8' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.33333V14.6667" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 4.66667V11.3333" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 4.66667V11.3333" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 6.66667V9.33333" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 3.33333V12.6667" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 3.33333V12.6667" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 6.66667V9.33333" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
