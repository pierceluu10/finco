"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  useGraphStore,
  selectVersion,
  selectTriggeredRules,
  selectNodes,
  selectEdges,
  type AlertItem,
} from "@/stores/graph-store";
import type { TriggeredRule } from "@/lib/rules/sentinel-rules";

function ruleSetKey(rules: TriggeredRule[]): string {
  return rules.map((r) => r.ruleId).sort().join(",");
}

export function useSentinelMonitor() {
  const version = useGraphStore(selectVersion);
  const triggeredRules = useGraphStore(selectTriggeredRules);
  const nodes = useGraphStore(selectNodes);
  const edges = useGraphStore(selectEdges);
  const setAlerts = useGraphStore((s) => s.setAlerts);
  const dismissedIds = useGraphStore((s) => s.dismissedAlertRuleIds);

  const ruleKey = useMemo(() => ruleSetKey(triggeredRules), [triggeredRules]);

  const prevRuleKeyRef = useRef("");
  const fetchingRef = useRef(false);

  const generateAlertCopy = useCallback(
    async (rules: TriggeredRule[]) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        const res = await fetch("/api/ai/sentinel-json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: `The following financial rules have been triggered for a user's ecosystem. Generate a short, actionable alert message (1 sentence, under 80 characters) for each rule. Return a JSON object with a "alerts" array where each element has "ruleId" and "text" fields.

Triggered rules:
${rules.map((r) => `- ${r.ruleId}: ${r.description}`).join("\n")}

Return only JSON. No explanation. No markdown.`,
          }),
        });
        const data = await res.json();
        const d = data.data as { alerts?: { ruleId: string; text: string }[] } | null;

        if (d?.alerts && Array.isArray(d.alerts)) {
          const newAlerts: AlertItem[] = d.alerts
            .filter((a) => !dismissedIds.has(a.ruleId))
            .map((a) => ({
              id: `alert-${a.ruleId}-${Date.now()}`,
              ruleId: a.ruleId,
              text: a.text,
              timestamp: Date.now(),
            }));
          setAlerts(newAlerts);
        } else {
          const fallbackAlerts: AlertItem[] = rules
            .filter((r) => !dismissedIds.has(r.ruleId))
            .map((r) => ({
              id: `alert-${r.ruleId}-${Date.now()}`,
              ruleId: r.ruleId,
              text: r.description,
              timestamp: Date.now(),
            }));
          setAlerts(fallbackAlerts);
        }
      } catch {
        const fallbackAlerts: AlertItem[] = rules
          .filter((r) => !dismissedIds.has(r.ruleId))
          .map((r) => ({
            id: `alert-${r.ruleId}-${Date.now()}`,
            ruleId: r.ruleId,
            text: r.description,
            timestamp: Date.now(),
          }));
        setAlerts(fallbackAlerts);
      } finally {
        fetchingRef.current = false;
      }
    },
    [setAlerts, dismissedIds]
  );

  useEffect(() => {
    if (version === 0) return;

    const currentKey = ruleKey;

    if (currentKey !== prevRuleKeyRef.current) {
      prevRuleKeyRef.current = currentKey;
      const triggeredRulesFromStore = useGraphStore.getState().triggeredRules;

      if (triggeredRulesFromStore.length === 0) {
        setAlerts([]);
      } else {
        generateAlertCopy(triggeredRulesFromStore);
      }
    }
  }, [version, ruleKey, generateAlertCopy, setAlerts]);

  return { triggeredRules, nodes, edges, version };
}
