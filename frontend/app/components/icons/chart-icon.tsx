interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function ChartIcon({ className, width = 20, height = 20, color = '#B0B4B8' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M2.5 2.5V15.8333C2.5 16.2754 2.67559 16.6993 2.98816 17.0118C3.30072 17.3244 3.72464 17.5 4.16667 17.5H17.5" stroke={color} strokeWidth="1.5" strokeMiterlimit="5.759" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.83594 11.6666L9.16927 8.33329L12.5026 11.6666L17.5026 6.66663" stroke={color} strokeWidth="1.5" strokeMiterlimit="5.759" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6.66663H17.5V9.16663" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
