interface CodeIconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function CodeIcon({ width = 21, height = 21, color = '#000000' }: CodeIconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.66667 8.66667L5 11.3333L7.66667 14M14.3333 8.66667L17 11.3333L14.3333 14M12.3333 6L9.66667 16.6667" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
