'use client';

import React from 'react';

export function VolumeChart({ data }: { data?: any }) {
  return (
    <div className="bg-surface2 rounded-lg p-4 border border-border">
      <div className="text-xs text-text-muted mb-2">24h Volume</div>
      <div className="text-xl font-bold text-text-primary">$0</div>
    </div>
  );
}