import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 24,
  stroke = '#0EA5E9',
  strokeWidth = 1.5,
  fill = 'none',
  className,
}) => {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} className={className} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 2);
    const y = height - 2 - ((d - min) / range) * (height - 4);
    return `${x + 1},${y}`;
  });

  const pathData = `M ${points[0]} L ${points.slice(1).join(' ')}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <path d={pathData} stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};
