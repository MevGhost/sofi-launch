import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, padding = 'md', children, ...props }, ref) => {
    const paddings = {
      sm: 'p-[var(--card-padding-sm,0.75rem)]',
      md: 'p-[var(--card-padding-md,1rem)]',
      lg: 'p-[var(--card-padding-lg,1.5rem)]',
    } as const;

    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface2 border border-border rounded-lg',
          paddings[padding],
          hover && 'hover:bg-surface3 hover:border-border-hover cursor-pointer transition-all duration-fast',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    positive: boolean;
  };
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, change, subtitle, icon, className }) => {
  return (
    <Card padding="sm" className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-micro uppercase tracking-wide text-text-muted font-medium">
            {label}
          </p>
          <p className="text-lg font-semibold text-text-primary mt-1 leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-text-muted mt-0.5">
              {subtitle}
            </p>
          )}
          {change && (
            <p className={cn(
              'text-xs mt-1 font-medium',
              change.positive ? 'text-success' : 'text-danger'
            )}>
              {change.positive ? '+' : ''}{change.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-text-muted flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};