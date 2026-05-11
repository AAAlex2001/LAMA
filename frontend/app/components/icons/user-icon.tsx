interface IconProps {
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export default function UserIcon({ className, width = 20, height = 20, color = '#1E1E1E' }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10 10C11.3261 10 12.5979 9.47322 13.5355 8.53553C14.4732 7.59785 15 6.32608 15 5C15 3.67392 14.4732 2.40215 13.5355 1.46447C12.5979 0.526784 11.3261 0 10 0C8.67392 0 7.40215 0.526784 6.46447 1.46447C5.52678 2.40215 5 3.67392 5 5C5 6.32608 5.52678 7.59785 6.46447 8.53553C7.40215 9.47322 8.67392 10 10 10ZM10 12.5C4.47 12.5 0 14.735 0 17.5V20H20V17.5C20 14.735 15.53 12.5 10 12.5Z"
        fill={color}
      />
    </svg>
  );
}
