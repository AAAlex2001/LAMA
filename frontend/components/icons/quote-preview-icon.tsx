import type { SVGProps } from 'react';

interface QuotePreviewIconProps extends SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  color?: string;
}

export default function QuotePreviewIcon({
  width = 10,
  height = 11,
  color = '#CED2D6',
  ...props
}: QuotePreviewIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 10 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10 6.35938C10 7.78379 8.80134 8.9375 7.32143 8.9375H7.14286C6.74777 8.9375 6.42857 8.63027 6.42857 8.25C6.42857 7.86973 6.74777 7.5625 7.14286 7.5625H7.32143C8.01116 7.5625 8.21429 6.85137 8.21429 6.1875H7.85714H7.14286C6.35491 6.1875 5.71429 5.5709 5.71429 4.8125V3.4375C5.71429 2.6791 6.35491 2.0625 7.14286 2.0625H8.57143C9.35937 2.0625 10 2.6791 10 3.4375V6.35938ZM4.28571 6.35938C4.28571 7.78379 3.08705 8.9375 1.60714 8.9375H1.42857C1.03348 8.9375 0.714285 8.63027 0.714285 8.25C0.714285 7.86973 1.03348 7.5625 1.42857 7.5625H1.60714C2.29687 7.5625 2.5 6.85137 2.5 6.1875H2.14286H1.42857C0.640625 6.1875 0 5.5709 0 4.8125V3.4375C0 2.6791 0.640625 2.0625 1.42857 2.0625H2.85714C3.64509 2.0625 4.28571 2.6791 4.28571 3.4375V6.35938Z"
        fill={color}
      />
    </svg>
  );
}
