import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { FiEye, FiEyeOff, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export interface AccessibleInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  ariaRequired?: boolean;
  // Validation
  validateOnBlur?: boolean;
  validator?: (value: string) => string | undefined;
  sanitizer?: (value: string) => string;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      size = 'md',
      icon,
      rightIcon,
      type = 'text',
      ariaLabel,
      ariaDescribedBy,
      ariaInvalid,
      ariaRequired,
      validateOnBlur,
      validator,
      sanitizer,
      disabled,
      required,
      id,
      onBlur,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [validationError, setValidationError] = useState<string | undefined>();
    const [isTouched, setIsTouched] = useState(false);

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const labelId = `${inputId}-label`;

    const displayError = error || (isTouched && validationError);

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-5 py-3 text-lg',
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsTouched(true);
      
      if (validateOnBlur && validator) {
        const error = validator(e.target.value);
        setValidationError(error);
      }

      if (onBlur) {
        onBlur(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      
      if (sanitizer) {
        value = sanitizer(value);
        e.target.value = value;
      }

      if (onChange) {
        onChange(e);
      }
    };

    const isPasswordField = type === 'password';
    const actualType = isPasswordField && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        {label && (
          <label
            id={labelId}
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-1',
              displayError ? 'text-danger' : success ? 'text-success' : 'text-text-secondary'
            )}
          >
            {label}
            {required && (
              <span className="text-danger ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={cn(
              'w-full bg-surface2 border rounded-lg text-text-primary placeholder-text-muted',
              'transition-all duration-fast',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-canvas',
              sizes[size],
              icon && 'pl-10',
              (rightIcon || isPasswordField) && 'pr-10',
              displayError && 'border-danger focus:ring-danger',
              success && 'border-success focus:ring-success',
              !displayError && !success && 'border-border hover:border-border-hover',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
            disabled={disabled}
            required={required}
            aria-label={ariaLabel || label}
            aria-labelledby={label ? labelId : undefined}
            aria-describedby={cn(
              ariaDescribedBy,
              displayError && errorId,
              helperText && helperId
            )}
            aria-invalid={ariaInvalid || !!displayError}
            aria-required={ariaRequired || required}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />

          {/* Right icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {displayError && (
              <FiAlertCircle className="w-4 h-4 text-danger" aria-hidden="true" />
            )}
            {success && !displayError && (
              <FiCheckCircle className="w-4 h-4 text-success" aria-hidden="true" />
            )}
            {isPasswordField && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            )}
            {rightIcon && !isPasswordField && !displayError && !success && rightIcon}
          </div>
        </div>

        {/* Helper text */}
        {displayError && (
          <p id={errorId} className="mt-1 text-xs text-danger flex items-center gap-1" role="alert">
            <FiAlertCircle className="w-3 h-3" aria-hidden="true" />
            {displayError}
          </p>
        )}
        {success && !displayError && (
          <p className="mt-1 text-xs text-success flex items-center gap-1">
            <FiCheckCircle className="w-3 h-3" aria-hidden="true" />
            {success}
          </p>
        )}
        {helperText && !displayError && !success && (
          <p id={helperId} className="mt-1 text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

// Accessible Select Component
export interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({ className, label, error, helperText, options, required, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium mb-1',
              error ? 'text-danger' : 'text-text-secondary'
            )}
          >
            {label}
            {required && <span className="text-danger ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-4 py-2 bg-surface2 border rounded-lg text-text-primary',
            'transition-all duration-fast',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-canvas',
            error && 'border-danger focus:ring-danger',
            !error && 'border-border hover:border-border-hover',
            className
          )}
          aria-describedby={cn(error && errorId, helperText && helperId)}
          aria-invalid={!!error}
          aria-required={required}
          {...props}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {error && (
          <p id={errorId} className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';