interface IconProps {
  width?: number;
  height?: number;
}

export default function PinIcon({ width = 24, height = 24 }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 20.9998L7.63 16.3688M7.635 16.3638L4.855 13.5838C3.901 12.6308 4.861 10.5878 6.165 10.5058C7.343 10.4308 10.07 10.8578 10.977 9.95081L13.467 7.46081C14.084 6.84281 13.692 5.46081 13.652 4.69881C13.594 3.68281 15.21 2.42781 16.067 3.28481L20.714 7.93281C21.574 8.79081 20.314 10.4018 19.301 10.3478C18.539 10.3078 17.156 9.91581 16.538 10.5328L14.048 13.0228C13.142 13.9298 13.568 16.6558 13.494 17.8338C13.412 19.1388 11.369 20.0988 10.414 19.1438L7.635 16.3638Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
