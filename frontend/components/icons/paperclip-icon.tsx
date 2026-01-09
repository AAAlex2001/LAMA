interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function PaperclipIcon({ className, width = 24, height = 24, color = '#383F45' }: IconProps) {
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
        d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59718 21.9983 8.00502 21.9983C6.41285 21.9983 4.88584 21.3658 3.76002 20.24C2.6342 19.1142 2.00171 17.5872 2.00171 15.995C2.00171 14.4028 2.6342 12.8758 3.76002 11.75L12.95 2.56C13.7006 1.80943 14.7186 1.38778 15.78 1.38778C16.8415 1.38778 17.8595 1.80943 18.61 2.56C19.3606 3.31057 19.7822 4.32855 19.7822 5.39C19.7822 6.45145 19.3606 7.46943 18.61 8.22L9.41002 17.41C9.03473 17.7853 8.52574 17.9961 7.99502 17.9961C7.4643 17.9961 6.9553 17.7853 6.58002 17.41C6.20473 17.0347 5.99391 16.5257 5.99391 15.995C5.99391 15.4643 6.20473 14.9553 6.58002 14.58L15.07 6.1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
