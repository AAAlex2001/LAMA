interface IconProps {
  width?: number;
  height?: number;
}

export default function SortClearIcon({ width = 16, height = 16 }: IconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.99967 14.6663C11.6817 14.6663 14.6663 11.6817 14.6663 7.99967C14.6663 4.31767 11.6817 1.33301 7.99967 1.33301C4.31767 1.33301 1.33301 4.31767 1.33301 7.99967C1.33301 11.6817 4.31767 14.6663 7.99967 14.6663Z"
        fill="white"
        stroke="#3B82F6"
        strokeLinejoin="round"
      />
      <path
        d="M9.88559 6.11426L6.11426 9.88559M6.11426 6.11426L9.88559 9.88559"
        stroke="#3B82F6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
