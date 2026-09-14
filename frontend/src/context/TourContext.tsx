import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

type TourContextValue = {
  active: boolean;
  start: () => void;
  finish: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { user, completeOnboarding } = useAuth();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (user && !user.onboardingCompletedAt) {
      setActive(true);
    }
  }, [user]);

  function start() {
    setActive(true);
  }

  function finish() {
    setActive(false);
    if (user && !user.onboardingCompletedAt) {
      completeOnboarding().catch(() => {});
    }
  }

  return <TourContext.Provider value={{ active, start, finish }}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour doit être utilisé dans un TourProvider");
  return ctx;
}
