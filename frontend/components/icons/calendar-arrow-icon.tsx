interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function CalendarArrowIcon({ className, width = 16, height = 16 }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.33398 8L7.33398 12M3.33398 8L7.33398 4M3.33398 8H12.6673"
        stroke="url(#paint0_linear_cal_arrow)"
        strokeOpacity="0.5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="paint0_linear_cal_arrow" x1="8.00065" y1="4" x2="8.00065" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6"/>
          <stop offset="0.5" stopColor="#2F67C3"/>
          <stop offset="0.75" stopColor="#295AAA"/>
          <stop offset="0.875" stopColor="#26539D"/>
          <stop offset="0.9375" stopColor="#244F96"/>
          <stop offset="1" stopColor="#234C90"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
