import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircleIcon } from "./icons";

const TOOLTIP_WIDTH = 224;
const MARGIN = 8;

// Bulle rendue via portail dans <body> en position fixed (coordonnées
// calculées en JS et bornées à la fenêtre) plutôt qu'en absolute : sinon
// elle se fait rogner par tout ancêtre avec overflow-y-auto (ex. Modal),
// qui force aussi le clip horizontal.
export function HelpTooltip({ text }: { text: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, MARGIN),
        window.innerWidth - TOOLTIP_WIDTH - MARGIN
      );
      const top = Math.min(rect.bottom + 6, window.innerHeight - 60);
      setPos({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <span ref={anchorRef} className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <HelpCircleIcon className="h-4 w-4 cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
      {open &&
        pos &&
        createPortal(
          <span
            className="pointer-events-none fixed z-[200] w-56 rounded-lg bg-slate-900 dark:bg-slate-700 px-2.5 py-1.5 text-xs font-normal leading-snug text-white shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}
