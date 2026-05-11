interface TagCloseIconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function TagCloseIcon({ width = 12, height = 12, color = "#000000" }: TagCloseIconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 11C8.7615 11 11 8.7615 11 6C11 3.2385 8.7615 1 6 1C3.2385 1 1 3.2385 1 6C1 8.7615 3.2385 11 6 11Z" stroke={color} strokeLinejoin="round"/>
      <path d="M7.41444 4.58575L4.58594 7.41425M4.58594 4.58575L7.41444 7.41425" stroke={color} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
