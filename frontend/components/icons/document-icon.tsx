interface DocumentIconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function DocumentIcon({ width = 32, height = 32, color = '#CED2D6' }: DocumentIconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.667 2.66699H9.33366C8.27032 2.66699 7.33366 3.60366 7.33366 4.66699V27.3337C7.33366 28.397 8.27032 29.3337 9.33366 29.3337H22.667C23.7303 29.3337 24.667 28.397 24.667 27.3337V9.33366L18.667 2.66699Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.667 2.66699V9.33366H24.667" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 17.3337H12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 22.667H12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.667 12H13.3337H12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
