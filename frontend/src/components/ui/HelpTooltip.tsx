import { HelpCircleIcon } from "./icons";

export function HelpTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircleIcon className="h-4 w-4 cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-56 -translate-x-1/2 rounded-lg bg-slate-900 dark:bg-slate-700 px-2.5 py-1.5 text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
