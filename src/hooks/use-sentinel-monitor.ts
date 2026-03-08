"use client";

import { useGraphStore, selectVersion } from "@/stores/graph-store";
import { useSentinelRules } from "@/hooks/use-sentinel-rules";

/**
 * Convenience hook that runs Sentinel rules from the graph store and
 * fetches alert copy when the triggered rule set changes.
 * Uses useSentinelRules internally.
 */
export function useSentinelMonitor() {
  const version = useGraphStore(selectVersion);
  const { triggeredRules, nodes, edges } = useSentinelRules();

  return {
    triggeredRules,
    nodes,
    edges,
    version,
  };
}
