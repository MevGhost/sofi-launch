import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helper, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="text-micro uppercase tracking-wide text-text-muted font-medium mb-1 block">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-10 bg-surface2/50 backdrop-blur-sm border border-border rounded-lg text-text-primary placeholder-text-muted',
              'focus:border-primary focus:bg-surface2 focus:outline-none transition-all duration-fast',
              icon ? 'pl-10 pr-4' : 'px-4',
              'text-sm',
              error && 'border-danger',
              className
            )}
            {...props}
          />
        </div>
        {helper && !error && (
          <p className="text-xs text-text-muted mt-1">{helper}</p>
        )}
        {error && (
          <p className="text-xs text-danger mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helper, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="text-micro uppercase tracking-wide text-text-muted font-medium mb-1 block">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full h-10 bg-surface2/50 backdrop-blur-sm border border-border rounded-lg text-text-primary',
            'focus:border-primary focus:bg-surface2 focus:outline-none transition-all duration-fast',
            'px-4 text-sm appearance-none cursor-pointer',
            error && 'border-danger',
            className
          )}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helper && !error && (
          <p className="text-xs text-text-muted mt-1">{helper}</p>
        )}
        {error && (
          <p className="text-xs text-danger mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';