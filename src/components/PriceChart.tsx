'use client';

import React, { useMemo } from 'react';

interface Point { time: string; price: number }

export function PriceChart({
  series,
  height = 320,
  showMA = false,
  maWindow = 14,
}: {
  series: Point[];
  height?: number;
  showMA?: boolean;
  maWindow?: number;
}) {
  const width = 800; // viewBox width; SVG will scale to container width

  const pathData = useMemo(() => {
    if (!series || series.length === 0) return { price: '', ma: '' };
    const prices = series.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pts = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * (width - 2);
      const y = height - 2 - ((p - min) / range) * (height - 4);
      return `${x + 1},${y}`;
    });

    let maPts: string[] = [];
    if (showMA) {
      const maSeries: number[] = [];
      for (let i = 0; i < prices.length; i++) {
        const start = Math.max(0, i - maWindow + 1);
        const slice = prices.slice(start, i + 1);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        maSeries.push(avg);
      }
      maPts = maSeries.map((p, i) => {
        const x = (i / (maSeries.length - 1)) * (width - 2);
        const y = height - 2 - ((p - min) / range) * (height - 4);
        return `${x + 1},${y}`;
      });
    }

    return {
      price: `M ${pts[0]} L ${pts.slice(1).join(' ')}`,
      ma: maPts.length ? `M ${maPts[0]} L ${maPts.slice(1).join(' ')}` : '',
    };
  }, [series, height, showMA, maWindow]);

  if (!series || series.length === 0) {
    return (
      <div className="bg-surface2 rounded-lg p-6 border border-border h-96 flex items-center justify-center">
        <div className="text-text-muted">No chart data</div>
      </div>
    );
  }

  return (
    <div className="bg-surface2 rounded-lg border border-border w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Price chart">
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        <path d={pathData.price} stroke="#0EA5E9" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {showMA && pathData.ma && (
          <path d={pathData.ma} stroke="#7dd3fc" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
        )}
      </svg>
    </div>
  );
}