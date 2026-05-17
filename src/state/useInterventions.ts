import { useCallback, useMemo, useState } from "react";
import {
  isOpenIntervention,
  type Intervention,
} from "../domain/intervention";

export function useInterventions(): {
  interventions: Intervention[];
  openInterventions: Intervention[];
  openCount: number;
  addIntervention: (intervention: Intervention) => void;
  acknowledgeIntervention: (id: string) => void;
  resolveIntervention: (id: string) => void;
  dismissIntervention: (id: string) => void;
  clearClosedInterventions: () => void;
  clearInterventions: () => void;
} {
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  const openInterventions = useMemo(
    () => interventions.filter(isOpenIntervention),
    [interventions],
  );

  const addIntervention = useCallback((intervention: Intervention) => {
    setInterventions((prev) => {
      if (prev.some((item) => item.id === intervention.id)) return prev;
      return [intervention, ...prev];
    });
  }, []);

  const acknowledgeIntervention = useCallback((id: string) => {
    setInterventions((prev) => prev.map((item) =>
      item.id === id && item.status === "open"
        ? { ...item, status: "acknowledged" as const }
        : item,
    ));
  }, []);

  const resolveIntervention = useCallback((id: string) => {
    setInterventions((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, status: "resolved" as const, resolvedAt: Date.now() }
        : item,
    ));
  }, []);

  const dismissIntervention = useCallback((id: string) => {
    setInterventions((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, status: "dismissed" as const, resolvedAt: Date.now() }
        : item,
    ));
  }, []);

  const clearClosedInterventions = useCallback(() => {
    setInterventions((prev) => prev.filter(isOpenIntervention));
  }, []);

  const clearInterventions = useCallback(() => {
    setInterventions([]);
  }, []);

  return {
    interventions,
    openInterventions,
    openCount: openInterventions.length,
    addIntervention,
    acknowledgeIntervention,
    resolveIntervention,
    dismissIntervention,
    clearClosedInterventions,
    clearInterventions,
  };
}
