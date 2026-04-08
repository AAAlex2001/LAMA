interface CloseIconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function CloseIcon({ width = 16, height = 16, color = '#000000' }: CloseIconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 8L12 12M8 8L4 4M8 8L4 12M8 8L12 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
