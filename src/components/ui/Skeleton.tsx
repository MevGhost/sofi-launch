import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const animationClass = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }[animation];

  const variantClass = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  }[variant];

  return (
    <div
      className={cn(
        'bg-surface3',
        animationClass,
        variantClass,
        className
      )}
      style={{
        width: width || (variant === 'circular' ? 40 : '100%'),
        height: height || (variant === 'text' ? 20 : 40),
      }}
      role="status"
      aria-label="Loading..."
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Skeleton components for common UI patterns
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-6 bg-surface2 rounded-xl border border-border', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton width={100} height={20} />
      </div>
      <Skeleton className="mb-2" />
      <Skeleton className="mb-2" width="80%" />
      <Skeleton width="60%" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full">
      <div className="border-b border-border pb-3 mb-3">
        <div className="grid grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={16} />
          ))}
        </div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-4 py-3 border-b border-border">
          {[...Array(6)].map((_, j) => (
            <Skeleton key={j} height={20} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonMetricCard() {
  return (
    <div className="p-4 bg-surface2 rounded-xl border border-border">
      <div className="flex items-center justify-between mb-2">
        <Skeleton width={80} height={14} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <Skeleton width={120} height={28} className="mb-2" />
      <Skeleton width={60} height={16} />
    </div>
  );
}

export function SkeletonButton({ className }: { className?: string }) {
  return (
    <Skeleton
      variant="rounded"
      height={40}
      className={cn('inline-block', className)}
    />
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={16}
        />
      ))}
    </div>
  );
}