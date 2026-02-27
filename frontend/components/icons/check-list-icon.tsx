interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function CheckListIcon({ className, width = 24, height = 24, color = '#B0B4B8' }: IconProps) {
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
        d="M8 12.4852L12.243 16.7282L20.727 8.24316M3 12.4852L7.243 16.7282M15.728 8.24316L12.5 11.5002" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}
