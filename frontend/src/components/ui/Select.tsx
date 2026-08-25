import { forwardRef, useId, type SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, className = "", id, children, ...props }, ref) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:focus:ring-slate-400 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
Select.displayName = "Select";
