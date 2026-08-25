import { forwardRef, useId, useLayoutEffect, useRef, type ChangeEvent, type InputHTMLAttributes } from "react";

type AmountInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  label?: string;
  value: string;
  onChange: (e: { target: { value: string } }) => void;
};

// Formate un montant brut ("1200.5") en affichage FR avec séparateur de
// milliers ("1 200,5"), en conservant les caractères en cours de saisie
// (virgule finale, décimales incomplètes) pour ne pas gêner la frappe.
function formatDisplay(raw: string): string {
  if (!raw) return "";
  const negative = raw.startsWith("-");
  const [intPart, decPart] = (negative ? raw.slice(1) : raw).split(".");
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = negative ? "-" : "";
  return decPart === undefined ? sign + groupedInt : `${sign}${groupedInt},${decPart}`;
}

// Reconstruit un montant brut ("1200.5") à partir de ce que l'utilisateur a
// tapé, en acceptant la virgule ou le point comme séparateur décimal.
function parseRaw(input: string): string {
  const negative = input.trim().startsWith("-");
  const digitsAndSeparators = input.replace(/[^\d,.]/g, "");
  const firstSep = digitsAndSeparators.search(/[,.]/);
  const sign = negative ? "-" : "";
  if (firstSep === -1) return sign + digitsAndSeparators;
  const intPart = digitsAndSeparators.slice(0, firstSep).replace(/[,.]/g, "");
  const decPart = digitsAndSeparators.slice(firstSep + 1).replace(/[,.]/g, "");
  return `${sign}${intPart}.${decPart}`;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ label, className = "", id, value, onChange, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const cursorFromEndRef = useRef<number | null>(null);

    useLayoutEffect(() => {
      if (cursorFromEndRef.current === null) return;
      const el = inputRef.current;
      if (el) {
        const pos = Math.max(0, el.value.length - cursorFromEndRef.current);
        el.setSelectionRange(pos, pos);
      }
      cursorFromEndRef.current = null;
    });

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      const displayed = e.target.value;
      cursorFromEndRef.current = displayed.length - (e.target.selectionStart ?? displayed.length);
      onChange({ target: { value: parseRaw(displayed) } });
    }

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
            {props.required && <span className="text-red-500 dark:text-red-400"> *</span>}
          </label>
        )}
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          id={inputId}
          type="text"
          inputMode="decimal"
          value={formatDisplay(value)}
          onChange={handleChange}
          className={`rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        />
      </div>
    );
  }
);
AmountInput.displayName = "AmountInput";
