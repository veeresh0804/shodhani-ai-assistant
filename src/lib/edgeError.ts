// Helpers for parsing the standardized edge function error envelope:
// { error: { code, message, requestId } }

export interface EdgeErrorEnvelope {
  code?: string;
  message?: string;
  requestId?: string;
}

export interface ParsedEdgeError {
  message: string;
  code?: string;
  requestId?: string;
}

/**
 * Normalize anything we might receive as an edge error into { message, code, requestId }.
 * Accepts:
 *  - new envelope: { error: { code, message, requestId } }
 *  - legacy string: { error: "something" }
 *  - thrown Error / unknown
 */
export function parseEdgeError(input: unknown): ParsedEdgeError {
  if (!input) return { message: "Something went wrong. Please try again." };

  // Supabase functions.invoke error or fetch JSON body
  if (typeof input === "object" && input !== null) {
    const anyInput = input as Record<string, unknown>;

    // { error: ... } envelope
    if ("error" in anyInput) {
      const err = anyInput.error;
      if (typeof err === "string") return { message: err };
      if (err && typeof err === "object") {
        const e = err as EdgeErrorEnvelope;
        return {
          message: e.message ?? "Something went wrong. Please try again.",
          code: e.code,
          requestId: e.requestId,
        };
      }
    }

    // Already-parsed envelope object
    if ("message" in anyInput || "code" in anyInput || "requestId" in anyInput) {
      const e = anyInput as EdgeErrorEnvelope;
      return {
        message: e.message ?? "Something went wrong. Please try again.",
        code: e.code,
        requestId: e.requestId,
      };
    }

    if (input instanceof Error) {
      // Error.message may itself be a JSON envelope string — try to parse.
      try {
        const parsed = JSON.parse(input.message);
        return parseEdgeError(parsed);
      } catch {
        return { message: input.message };
      }
    }
  }

  if (typeof input === "string") {
    try {
      return parseEdgeError(JSON.parse(input));
    } catch {
      return { message: input };
    }
  }

  return { message: String(input) };
}

/** Build a toast description string that surfaces code + requestId when available. */
export function formatEdgeErrorDescription(err: ParsedEdgeError): string {
  const parts: string[] = [];
  if (err.code) parts.push(`[${err.code}]`);
  parts.push(err.message);
  if (err.requestId) parts.push(`(Request ID: ${err.requestId})`);
  return parts.join(" ");
}

/** Convenience: parse + format in one go. */
export function describeEdgeError(input: unknown): string {
  return formatEdgeErrorDescription(parseEdgeError(input));
}
