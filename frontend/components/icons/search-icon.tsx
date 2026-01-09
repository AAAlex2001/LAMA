import { useId } from 'react';

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function SearchIcon({ className, width = 18, height = 18 }: IconProps) {
  const gradientId1 = useId();
  const gradientId2 = useId();

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M7.88986 12.7793C10.5904 12.7793 12.7797 10.5901 12.7797 7.88965C12.7797 5.18917 10.5904 3 7.88986 3C5.18926 3 3 5.18917 3 7.88965C3 10.5901 5.18926 12.7793 7.88986 12.7793Z"
        stroke={`url(#${gradientId1})`}
        strokeWidth="1.5"
      />
      <path
        d="M11.4434 11.4447L14.9996 15.0008"
        stroke={`url(#${gradientId2})`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id={gradientId1} x1="3" y1="7.88965" x2="12.7797" y2="7.88965" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6"/>
          <stop offset="0.5" stopColor="#2F67C3"/>
          <stop offset="0.75" stopColor="#295AAA"/>
          <stop offset="0.875" stopColor="#26539D"/>
          <stop offset="0.9375" stopColor="#244F96"/>
          <stop offset="1" stopColor="#234C90"/>
        </linearGradient>
        <linearGradient id={gradientId2} x1="11.4434" y1="13.2227" x2="14.9996" y2="13.2227" gradientUnits="userSpaceOnUse">
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
