import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type ChangeLike = { target: { value: string } };

type SelectProps = {
  label?: string;
  value: string;
  onChange: (e: ChangeLike) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

type OptionData = { value: string; label: string; disabled: boolean };

function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) return nodeToText((node.props as { children?: ReactNode }).children);
  return "";
}

function extractOptions(children: ReactNode): OptionData[] {
  const options: OptionData[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string; children?: ReactNode; disabled?: boolean };
    options.push({
      value: props.value ?? "",
      label: nodeToText(props.children),
      disabled: !!props.disabled,
    });
  });
  return options;
}

// Champ de sélection filtrable : conserve la même API que <select> (label,
// value, onChange, children d'<option>) pour rester un remplacement direct,
// mais affiche un champ de recherche + une liste déroulante filtrée.
export function Select({ label, value, onChange, required, disabled, className = "", children }: SelectProps) {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const options = useMemo(() => extractOptions(children), [children]);
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [filtered.length, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectOption(option: OptionData) {
    if (option.disabled) return;
    onChange({ target: { value: option.value } });
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[highlight];
      if (option) selectOption(option);
    } else if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {required && <span className="text-red-500 dark:text-red-400"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-required={required}
          disabled={disabled}
          autoComplete="off"
          value={open ? query : selected?.label ?? ""}
          placeholder="Sélectionner…"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-500 dark:focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
        {open && !disabled && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">Aucun résultat</li>
            ) : (
              filtered.map((option, index) => (
                <li
                  key={option.value || `_empty_${index}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(option);
                  }}
                  className={`px-3 py-2 text-sm ${
                    option.disabled
                      ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
                      : `cursor-pointer ${
                          index === highlight
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`
                  } ${option.value === value ? "font-medium" : ""}`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
