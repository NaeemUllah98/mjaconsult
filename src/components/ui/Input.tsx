import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, hint, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-ink-soft"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "input-base",
              icon && "pl-11",
              error && "border-rose-300 focus:border-rose-400 focus:ring-rose-100",
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-ink-soft"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "input-base min-h-[110px] resize-y",
            error && "border-rose-300 focus:ring-rose-100",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-ink-soft"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn("input-base cursor-pointer pr-10", className)}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";
