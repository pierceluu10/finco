/**
 * Server-only HTTP client for the Backboard REST API.
 * Uses raw fetch — no external SDK dependency.
 */

const BACKBOARD_BASE_URL = "https://app.backboard.io/api";

function getApiKey(): string {
  const key = process.env.BACKBOARD_API_KEY;
  if (!key) throw new Error("BACKBOARD_API_KEY is not configured");
  return key;
}

export function isBackboardConfigured(): boolean {
  return Boolean(process.env.BACKBOARD_API_KEY);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BackboardAssistant {
  assistant_id: string;
  name: string;
  system_prompt?: string | null;
  description?: string | null;
  tools?: BackboardToolDef[] | null;
  created_at: string;
}

export interface BackboardThread {
  thread_id: string;
  assistant_id: string;
  created_at: string;
}

export interface BackboardToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        {
          type: string;
          description?: string;
          enum?: string[];
        }
      >;
      required?: string[];
    };
  };
}

export interface BackboardToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type MessageStatus =
  | "IN_PROGRESS"
  | "REQUIRES_ACTION"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface BackboardMessageResponse {
  message: string;
  thread_id: string;
  content: string | null;
  message_id?: string | null;
  role?: "user" | "assistant" | "tool" | null;
  status?: MessageStatus | null;
  tool_calls?: BackboardToolCall[] | null;
  run_id?: string | null;
}

// ---------------------------------------------------------------------------
// Internal HTTP helpers
// ---------------------------------------------------------------------------

async function backboardJSON<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${BACKBOARD_BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Backboard API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function backboardForm<T = unknown>(
  path: string,
  data: Record<string, string>
): Promise<T> {
  const apiKey = getApiKey();
  const params = new URLSearchParams(data);

  const res = await fetch(`${BACKBOARD_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Backboard API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listAssistants(): Promise<BackboardAssistant[]> {
  const res = await backboardJSON<
    BackboardAssistant[] | { assistants: BackboardAssistant[] }
  >("/assistants");
  if (Array.isArray(res)) return res;
  return (res as { assistants: BackboardAssistant[] }).assistants ?? [];
}

export async function createAssistant(opts: {
  name: string;
  system_prompt: string;
  tools?: BackboardToolDef[];
}): Promise<BackboardAssistant> {
  return backboardJSON<BackboardAssistant>("/assistants", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

export async function updateAssistant(
  assistantId: string,
  opts: { system_prompt?: string; tools?: BackboardToolDef[] }
): Promise<BackboardAssistant> {
  return backboardJSON<BackboardAssistant>(`/assistants/${assistantId}`, {
    method: "PUT",
    body: JSON.stringify(opts),
  });
}

export async function createThread(
  assistantId: string
): Promise<BackboardThread> {
  return backboardJSON<BackboardThread>(
    `/assistants/${assistantId}/threads`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

const BACKBOARD_SOFT_ERRORS = [
  "no credits available",
  "please add credits",
  "subscribe to continue",
  "quota exceeded",
  "rate limit",
];

function isBackboardSoftError(content: string | null | undefined): boolean {
  if (!content) return false;
  const lower = content.toLowerCase();
  return BACKBOARD_SOFT_ERRORS.some((phrase) => lower.includes(phrase));
}

export async function addMessage(
  threadId: string,
  content: string,
  options?: { memory?: "Auto" | "off" | "Readonly" }
): Promise<BackboardMessageResponse> {
  const data: Record<string, string> = {
    content,
    stream: "false",
  };
  if (options?.memory) data.memory = options.memory;

  const response = await backboardForm<BackboardMessageResponse>(
    `/threads/${threadId}/messages`,
    data
  );

  if (isBackboardSoftError(response.content)) {
    throw new Error(`Backboard account issue: ${response.content}`);
  }

  return response;
}

export async function submitToolOutputs(
  threadId: string,
  runId: string,
  toolOutputs: { tool_call_id: string; output: string }[]
): Promise<BackboardMessageResponse> {
  return backboardJSON<BackboardMessageResponse>(
    `/threads/${threadId}/runs/${runId}/submit-tool-outputs`,
    {
      method: "POST",
      body: JSON.stringify({ tool_outputs: toolOutputs }),
    }
  );
}
