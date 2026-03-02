"use client";
import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { getTierConfig, hasFeature, getModelForTask, getMonthlyActionLimit } from "@/lib/tiers";

const TierContext = createContext(null);

export function TierProvider({ children, initialTier = "trial" }) {
  const [tierId, setTierId] = useState(initialTier);
  const [seatCount, setSeatCount] = useState(1);
  const [actionsUsed, setActionsUsed] = useState(0);
  const [trialStartDate] = useState(() => new Date());
  const [billingCycle, setBillingCycle] = useState("monthly");

  const tierConfig = useMemo(() => getTierConfig(tierId), [tierId]);
  const actionLimit = useMemo(() => getMonthlyActionLimit(tierId, seatCount), [tierId, seatCount]);

  const trialDaysRemaining = useMemo(() => {
    if (tierId !== "trial") return null;
    const elapsed = Math.floor((Date.now() - trialStartDate.getTime()) / 86400000);
    return Math.max(0, 30 - elapsed);
  }, [tierId, trialStartDate]);

  const trialExpired = tierId === "trial" && trialDaysRemaining === 0;

  const incrementActions = useCallback((count = 1) => {
    setActionsUsed((prev) => prev + count);
  }, []);

  const canPerformAction = useMemo(() => actionsUsed < actionLimit, [actionsUsed, actionLimit]);
  const usagePercent = useMemo(
    () => (actionLimit > 0 ? Math.min(100, Math.round((actionsUsed / actionLimit) * 100)) : 0),
    [actionsUsed, actionLimit]
  );

  const checkFeature = useCallback(
    (featureKey) => {
      if (!featureKey) return true;
      return hasFeature(tierId, featureKey);
    },
    [tierId]
  );

  const getModel = useCallback(
    (actionType) => getModelForTask(tierId, actionType),
    [tierId]
  );

  const value = useMemo(
    () => ({
      tierId,
      setTierId,
      tierConfig,
      seatCount,
      setSeatCount,
      actionsUsed,
      actionLimit,
      incrementActions,
      canPerformAction,
      usagePercent,
      trialDaysRemaining,
      trialExpired,
      billingCycle,
      setBillingCycle,
      checkFeature,
      getModel,
    }),
    [tierId, tierConfig, seatCount, actionsUsed, actionLimit, incrementActions, canPerformAction, usagePercent, trialDaysRemaining, trialExpired, billingCycle, checkFeature, getModel]
  );

  return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

export function useTier() {
  const ctx = useContext(TierContext);
  if (!ctx) throw new Error("useTier must be used within a TierProvider");
  return ctx;
}

export default TierContext;
