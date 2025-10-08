import React from 'react';
import { cn } from '@/lib/utils';

// Skip link for keyboard navigation
export const SkipLink: React.FC<{
  href: string;
  children: React.ReactNode;
  className?: string;
}> = ({ href, children, className }) => (
  <a
    href={href}
    className={cn(
      'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50',
      'bg-white text-black px-4 py-2 rounded font-medium',
      'focus:outline-none focus:ring-2 focus:ring-blue-500',
      className
    )}
  >
    {children}
  </a>
);

// Screen reader only content
export const ScreenReaderOnly: React.FC<{
  children: React.ReactNode;
  asChild?: boolean;
}> = ({ children, asChild = false }) => {
  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as { className?: string };
    return React.cloneElement(children, {
      className: cn(childProps.className, 'sr-only')
    } as any);
  }

  return <span className="sr-only">{children}</span>;
};

// Announces content changes to screen readers
export const LiveRegion: React.FC<{
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
}> = ({
  children,
  politeness = 'polite',
  atomic = false,
  className
}) => (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );

// Focus management hook
export const useFocusManagement = () => {
  const focusRef = React.useRef<HTMLElement | null>(null);

  const setFocus = React.useCallback((element?: HTMLElement | null) => {
    if (element) {
      focusRef.current = element;
      element.focus();
    } else if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  const restoreFocus = React.useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  return { setFocus, restoreFocus };
};

// Keyboard navigation hook
export const useKeyboardNavigation = (
  onEscape?: () => void,
  onEnter?: () => void,
  onArrowDown?: () => void,
  onArrowUp?: () => void
) => {
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        onEscape?.();
        break;
      case 'Enter':
        onEnter?.();
        break;
      case 'ArrowDown':
        event.preventDefault();
        onArrowDown?.();
        break;
      case 'ArrowUp':
        event.preventDefault();
        onArrowUp?.();
        break;
    }
  }, [onEscape, onEnter, onArrowDown, onArrowUp]);

  return { handleKeyDown };
};

// Accessible button component
export const AccessibleButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({
  children,
  onClick,
  ariaLabel,
  ariaDescribedBy,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className
}) => {
    const baseClasses = 'rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 disabled:bg-gray-100',
      ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 disabled:text-gray-400'
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
      >
        {children}
      </button>
    );
  };

// Accessible form field wrapper
export const FormFieldWrapper: React.FC<{
  label: string;
  id: string;
  children: React.ReactNode;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
}> = ({
  label,
  id,
  children,
  error,
  description,
  required = false,
  className
}) => {
    const errorId = error ? `${id}-error` : undefined;
    const descriptionId = description ? `${id}-description` : undefined;

    return (
      <div className={cn('space-y-2', className)}>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-900"
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>

        {description && (
          <p id={descriptionId} className="text-sm text-gray-600">
            {description}
          </p>
        )}

        {React.cloneElement(children as React.ReactElement, {
          id,
          'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
          'aria-invalid': error ? 'true' : undefined,
        } as any)}

        {error && (
          <p
            id={errorId}
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  };

// Color contrast utilities
export const ensureMinimumContrast = (
  foregroundColor: string,
  backgroundColor: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean => {
  // This is a simplified version - in production you'd use a proper color contrast library
  // For now, just check common contrast patterns
  const contrastPatterns = {
    AA: [
      { fg: '#000000', bg: '#ffffff' },
      { fg: '#ffffff', bg: '#000000' },
      { fg: '#1f2937', bg: '#ffffff' },
      { fg: '#ffffff', bg: '#1f2937' }
    ],
    AAA: [
      { fg: '#000000', bg: '#ffffff' },
      { fg: '#ffffff', bg: '#000000' }
    ]
  };

  return contrastPatterns[level].some(
    pattern => pattern.fg === foregroundColor && pattern.bg === backgroundColor
  );
};

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};