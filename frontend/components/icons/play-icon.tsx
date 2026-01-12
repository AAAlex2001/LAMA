interface PlayIconProps {
  width?: number;
  height?: number;
  color?: string;
}

export default function PlayIcon({ width = 24, height = 24, color = '#CED2D6' }: PlayIconProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5V19L19 12L8 5Z" fill={color}/>
    </svg>
  );
}
