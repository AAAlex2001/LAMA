import { useId } from 'react';

interface ArrowRightIconProps {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  variant?: 'solid' | 'gradient';
}

export default function ArrowRightIcon({
  width = 20,
  height = 20,
  color = 'currentColor',
  className,
  variant = 'solid',
}: ArrowRightIconProps) {
  const rawId = useId();
  const gradientId = `arrow-grad-${rawId.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const stroke = variant === 'gradient' ? `url(#${gradientId})` : color;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#2F67C3" />
            <stop offset="75%" stopColor="#295AAA" />
            <stop offset="100%" stopColor="#234C90" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
