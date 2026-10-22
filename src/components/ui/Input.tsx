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
      <label htmlFor={inputId} className="text-sm font-bold text-washi">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          // text-base keeps iOS from zooming in on focus
          'h-12 rounded-xl border bg-sumi-1 px-4 text-base text-washi caret-washi transition-colors placeholder:text-washi-muted',
          'focus:border-washi focus:outline-2 focus:outline-offset-2 focus:outline-washi',
          error ? 'border-error' : 'border-field-edge',
          className,
        )}
        {...props}
      />
      {message && (
        <p id={messageId} className={cn('text-sm', error ? 'font-medium text-error' : 'text-washi-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}
