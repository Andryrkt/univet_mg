import { useLayoutEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTour } from "../../context/TourContext";
import { tourSteps } from "../../lib/tourSteps";
import { Button } from "../ui/Button";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "../ui/icons";

const SPOTLIGHT_PADDING = 6;

export function TourOverlay() {
  const { user } = useAuth();
  const { finish } = useTour();
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps = tourSteps.filter((step) => !step.roles || (user && step.roles.includes(user.role)));
  const step = steps[stepIndex];

  useLayoutEffect(() => {
    if (!step) return;

    function updateRect() {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [step]);

  if (!step) return null;

  const isLast = stepIndex === steps.length - 1;

  const spotlightStyle = rect
    ? {
        position: "fixed" as const,
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
        boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
        borderRadius: "0.75rem",
        pointerEvents: "none" as const,
        transition: "all 150ms ease",
      }
    : {
        position: "fixed" as const,
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
      };

  const tooltipTop = rect ? Math.min(rect.bottom + 12, window.innerHeight - 200) : window.innerHeight / 2 - 80;
  const tooltipLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 336) : window.innerWidth / 2 - 160;

  return (
    <div className="fixed inset-0 z-[100]">
      <div style={spotlightStyle} />
      <div
        className="fixed z-[101] w-80 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-xl border border-slate-200 dark:border-slate-800"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
          <button
            onClick={finish}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Passer la visite"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{step.text}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {stepIndex + 1} / {steps.length}
          </span>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="secondary" onClick={() => setStepIndex((i) => i - 1)}>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}>
              {isLast ? "Terminer" : (
                <>
                  Suivant <ChevronRightIcon className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
