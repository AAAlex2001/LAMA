interface IconProps {
  width?: number;
  height?: number;
}

export default function BlockedIcon({ width = 14, height = 14 }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.66667 0C10.3333 0 13.3333 3 13.3333 6.66667C13.3333 10.3333 10.3333 13.3333 6.66667 13.3333C3 13.3333 0 10.3333 0 6.66667C0 3 3 0 6.66667 0ZM6.66667 1.33333C5.4 1.33333 4.26667 1.73333 3.4 2.46667L10.8667 9.93333C11.5333 9 12 7.86667 12 6.66667C12 3.73333 9.6 1.33333 6.66667 1.33333ZM9.93333 10.8667L2.46667 3.4C1.73333 4.26667 1.33333 5.4 1.33333 6.66667C1.33333 9.6 3.73333 12 6.66667 12C7.93333 12 9.06667 11.6 9.93333 10.8667Z"
        fill="currentColor"
      />
    </svg>
  );
}
