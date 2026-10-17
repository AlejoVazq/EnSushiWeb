'use client';

import { useId, type ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export interface InputProps extends ComponentProps<'input'> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          // text-base keeps iOS from zooming in on focus
          'h-12 rounded-xl border bg-surface px-4 text-base text-fg transition-colors placeholder:text-subtle',
          'focus:border-accent focus:outline-none',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...props}
      />
      {message && (
        <p id={messageId} className={cn('text-sm', error ? 'text-danger' : 'text-subtle')}>
          {message}
        </p>
      )}
    </div>
  );
}
