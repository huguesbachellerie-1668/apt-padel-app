'use client';

import { useFormStatus } from 'react-dom';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  pendingText?: string;
  formAction?: any;
}

export default function SubmitButton({ children, pendingText, className, formAction, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={`${className} ${pending ? 'opacity-70 cursor-wait' : ''}`}
      formAction={formAction as any}
      {...props}
    >
      <span className="flex items-center justify-center gap-2 w-full h-full">
        {pending && (
          <svg className="animate-spin h-5 w-5 text-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {pending && pendingText ? pendingText : children}
      </span>
    </button>
  );
}
