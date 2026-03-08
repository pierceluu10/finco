/**
 * Thread persistence: maps each (user, agent) pair to a single
 * Backboard thread, stored in Supabase's user_agent_threads table.
 */

import { createThread as backboardCreateThread } from "./client";
import { getServiceClient } from "@/lib/supabase";
import { auth0 } from "@/lib/auth0";
import type { AgentName } from "./assistants";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

// ---------------------------------------------------------------------------
// User resolution
// ---------------------------------------------------------------------------

export async function resolveUserId(): Promise<string> {
  try {
    const session = await auth0.getSession();
    if (!session?.user) return DEMO_USER_ID;

    const supa = getServiceClient();
    const auth0Id: string = session.user.sub;

    const { data: existing } = await supa
      .from("users")
      .select("id")
      .eq("auth0_id", auth0Id)
      .single();

    if (existing) return existing.id;

    const { data: created, error } = await supa
      .from("users")
      .insert({
        auth0_id: auth0Id,
        email: (session.user.email as string) || "",
        name: (session.user.name as string) || "",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create Finco user:", error);
      return DEMO_USER_ID;
    }

    return created.id;
  } catch {
    return DEMO_USER_ID;
  }
}

// ---------------------------------------------------------------------------
// Thread get-or-create
// ---------------------------------------------------------------------------

export async function getOrCreateThread(
  userId: string,
  agentName: AgentName,
  assistantId: string
): Promise<string> {
  const supa = getServiceClient();

  const { data: existing } = await supa
    .from("user_agent_threads")
    .select("thread_id")
    .eq("user_id", userId)
    .eq("agent_name", agentName)
    .single();

  if (existing) return existing.thread_id;

  const thread = await backboardCreateThread(assistantId);

  const { error } = await supa.from("user_agent_threads").insert({
    user_id: userId,
    agent_name: agentName,
    assistant_id: assistantId,
    thread_id: thread.thread_id,
  });

  if (error) {
    console.error("Failed to persist thread mapping:", error);
  }

  return thread.thread_id;
}
