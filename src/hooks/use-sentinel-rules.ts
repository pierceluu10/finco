"use client";

import { useEffect, useRef, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useGraphStore,
  selectNodes,
  selectEdges,
  type AlertItem,
} from "@/stores/graph-store";
import { runSentinelRules, checkSentinelRules } from "@/lib/rules/sentinel-rules";

/**
 * Reactively runs sentinel rules from store nodes/edges.
 * When triggered rule set changes, calls Sentinel API and updates store alerts.
 * Uses ref guard and functional setAlerts to avoid loops.
 */
export function useSentinelRules() {
  const nodes = useGraphStore(useShallow(selectNodes));
  const edges = useGraphStore(useShallow(selectEdges));
  const setAlerts = useGraphStore((s) => s.setAlerts);

  const triggeredRules = useMemo(
    () => runSentinelRules(nodes, edges),
    [nodes, edges]
  );

  const triggeredRulesKey = useMemo(
    () => [...triggeredRules].sort().join(","),
    [triggeredRules]
  );

  const prevRulesKeyRef = useRef("");
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (triggeredRulesKey === prevRulesKeyRef.current) return;
    prevRulesKeyRef.current = triggeredRulesKey;

    if (triggeredRulesKey === "") {
      setAlerts([]);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const state = useGraphStore.getState();
    const fullRules = checkSentinelRules(state.nodes, state.edges);
    const dismissedSet = new Set(state.dismissedAlertRuleIds);

    fetch("/api/ai/sentinel-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userMessage: `The following financial rules have been triggered for a user's ecosystem. Generate a short, actionable alert message (1 sentence, under 80 characters) for each rule. Return a JSON object with an "alerts" array where each element has "ruleId" and "text" fields.

Triggered rules:
${fullRules.map((r) => `- ${r.ruleId}: ${r.description}`).join("\n")}

Return only JSON. No explanation. No markdown.`,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const d = data.data as { alerts?: { ruleId: string; text: string }[] } | null;
        if (d?.alerts && Array.isArray(d.alerts)) {
          const newAlerts: AlertItem[] = d.alerts
            .filter((a) => !dismissedSet.has(a.ruleId))
            .map((a) => ({
              id: `alert-${a.ruleId}-${Date.now()}`,
              ruleId: a.ruleId,
              text: a.text,
              timestamp: Date.now(),
            }));
          setAlerts((prev) => {
            const newKey = newAlerts.map((a) => a.id).sort().join(",");
            const oldKey = prev.map((a) => a.id).sort().join(",");
            return newKey === oldKey ? prev : newAlerts;
          });
        } else {
          const fallback: AlertItem[] = fullRules
            .filter((r) => !dismissedSet.has(r.ruleId))
            .map((r) => ({
              id: `alert-${r.ruleId}-${Date.now()}`,
              ruleId: r.ruleId,
              text: r.description,
              timestamp: Date.now(),
            }));
          setAlerts((prev) => {
            const newKey = fallback.map((a) => a.id).sort().join(",");
            const oldKey = prev.map((a) => a.id).sort().join(",");
            return newKey === oldKey ? prev : fallback;
          });
        }
      })
      .catch(() => {
        const fallback: AlertItem[] = fullRules
          .filter((r) => !dismissedSet.has(r.ruleId))
          .map((r) => ({
            id: `alert-${r.ruleId}-${Date.now()}`,
            ruleId: r.ruleId,
            text: r.description,
            timestamp: Date.now(),
          }));
        setAlerts((prev) => {
          const newKey = fallback.map((a) => a.id).sort().join(",");
          const oldKey = prev.map((a) => a.id).sort().join(",");
          return newKey === oldKey ? prev : fallback;
        });
      })
      .finally(() => {
        fetchingRef.current = false;
      });
  }, [triggeredRulesKey, setAlerts]);

  return { triggeredRules, nodes, edges };
}
