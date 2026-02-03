import { useId } from 'react';

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function FlagRu({ className, width = 14, height = 10 }: IconProps) {
  const maskId = useId();
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 14 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="0.25" y="0.25" width="13.5" height="9.5" rx="1.75" fill="white" stroke="#F5F5F5" strokeWidth="0.5" />
      <mask id={maskId} style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="0" y="0" width="14" height="10">
        <rect x="0.25" y="0.25" width="13.5" height="9.5" rx="1.75" fill="white" stroke="white" strokeWidth="0.5" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path fillRule="evenodd" clipRule="evenodd" d="M0 6.66668H14V3.33334H0V6.66668Z" fill="#0C47B7" />
        <path fillRule="evenodd" clipRule="evenodd" d="M0 9.99999H14V6.66666H0V9.99999Z" fill="#E53B35" />
      </g>
    </svg>
  );
}
