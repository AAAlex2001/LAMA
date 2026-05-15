interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function ClickIcon({ className, width = 12, height = 12, color = '#B0B4B8' }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6.26191 1V2.57895M2.57936 6.26053H1M2.54041 2.54316L3.65649 3.66M9.98552 2.53947L8.86786 3.65632M3.65596 8.86684L2.53988 9.98263M5.73546 5.73684L11 8.05263L8.66412 8.66474L8.05186 11L5.73546 5.73684Z"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
