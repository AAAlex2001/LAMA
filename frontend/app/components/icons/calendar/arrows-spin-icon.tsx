interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function ArrowsSpinIcon({ className, width = 16, height = 16, color = '#000000' }: IconProps) {
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
        d="M13.2929 4.70711C13.9229 5.59298 14.3041 6.63262 14.3955 7.71964C14.4868 8.80665 14.2849 9.89856 13.8117 10.883C13.3386 11.8674 12.6116 12.7078 11.7054 13.3188C10.7993 13.9298 9.74676 14.2893 8.65676 14.3617C7.56677 14.434 6.47889 14.2167 5.50596 13.7312C4.53302 13.2457 3.71099 12.5092 3.1215 11.5968C2.53201 10.6844 2.19591 9.6291 2.14725 8.53817C2.0986 7.44724 2.3392 6.36174 2.84407 5.39257"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 5H13.5V1.5"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
