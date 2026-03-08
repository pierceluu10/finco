/**
 * Output validators for Backboard agent responses.
 * Used to enforce structured output before returning to the client.
 */

export interface SimulatorValidation {
  valid: boolean;
  cleanedOutput: string;
  correctionPrompt: string | null;
}

/**
 * Validates that Simulator output follows the 4-line structure:
 * 1. What changed
 * 2. What was affected
 * 3. Practical observation
 * 4. Next step
 */
export function validateSimulatorOutput(text: string): SimulatorValidation {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      cleanedOutput: text,
      correctionPrompt:
        "Your response was empty. Provide exactly 4 lines: (1) what changed, (2) what was affected, (3) one observation, (4) one next step. Use exact numbers.",
    };
  }

  let cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#+\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .trim();

  // Remove quotation marks around what look like node labels
  cleaned = cleaned.replace(/"([^"]{1,40})"/g, "$1");

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length > 6) {
    // Too verbose — truncate to first 4 meaningful lines
    cleaned = lines.slice(0, 4).join("\n");
    return {
      valid: false,
      cleanedOutput: cleaned,
      correctionPrompt:
        "Your response was too long. Rewrite in exactly 4 lines: (1) what changed, (2) what was affected, (3) one observation, (4) one next step.",
    };
  }

  if (lines.length < 2) {
    return {
      valid: false,
      cleanedOutput: cleaned,
      correctionPrompt:
        "Your response was too short. Provide exactly 4 lines: (1) what changed, (2) what was affected, (3) one observation, (4) one next step.",
    };
  }

  return {
    valid: true,
    cleanedOutput: cleaned,
    correctionPrompt: null,
  };
}
