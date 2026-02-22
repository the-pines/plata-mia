'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-sm transition-all duration-150 focus:outline-none focus-visible:outline-1 focus-visible:outline-phosphor focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]'

    const variants = {
      primary: 'bg-phosphor text-surface-page hover:bg-phosphor-bright shadow-[0_0_12px_-2px_rgba(0,255,65,0.4)] hover:shadow-[0_0_16px_-2px_rgba(0,255,65,0.6)]',
      secondary: 'bg-surface-hover border border-border-hover text-primary hover:border-border-active',
      outline: 'border border-border-hover text-secondary hover:border-phosphor hover:text-phosphor hover:shadow-[0_0_8px_-2px_rgba(0,255,65,0.2)]',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs uppercase tracking-wider',
      md: 'px-4 py-2 text-sm uppercase tracking-wider',
      lg: 'px-6 py-3 text-sm uppercase tracking-wider',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'
