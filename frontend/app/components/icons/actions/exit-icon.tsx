interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function ExitIcon({ className, width = 19, height = 19, color = '#1E1E1E' }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12.3214 13.6071V16.1786C12.3214 16.5196 12.186 16.8466 11.9449 17.0877C11.7037 17.3288 11.3767 17.4643 11.0357 17.4643H2.03571C1.69472 17.4643 1.3677 17.3288 1.12658 17.0877C0.885459 16.8466 0.75 16.5196 0.75 16.1786V2.03571C0.75 1.69472 0.885459 1.3677 1.12658 1.12658C1.3677 0.885459 1.69472 0.75 2.03571 0.75H11.0357C11.3767 0.75 11.7037 0.885459 11.9449 1.12658C12.186 1.3677 12.3214 1.69472 12.3214 2.03571V4.60714M8.46429 9.10714H17.4643M17.4643 9.10714L14.8929 6.53571M17.4643 9.10714L14.8929 11.6786"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
