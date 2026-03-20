interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function BanIcon({ className, width = 20, height = 20, color = '#B0B4B8' }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M9.9974 1.66663C14.5807 1.66663 18.3307 5.41663 18.3307 9.99996C18.3307 14.5833 14.5807 18.3333 9.9974 18.3333C5.41406 18.3333 1.66406 14.5833 1.66406 9.99996C1.66406 5.41663 5.41406 1.66663 9.9974 1.66663ZM9.9974 3.33329C8.41406 3.33329 6.9974 3.83329 5.91406 4.74996L15.2474 14.0833C16.0807 12.9166 16.6641 11.5 16.6641 9.99996C16.6641 6.33329 13.6641 3.33329 9.9974 3.33329ZM14.0807 15.25L4.7474 5.91663C3.83073 6.99996 3.33073 8.41663 3.33073 9.99996C3.33073 13.6666 6.33073 16.6666 9.9974 16.6666C11.5807 16.6666 12.9974 16.1666 14.0807 15.25Z" fill={color} />
    </svg>
  );
}
