// Shared error response helper for all edge functions.
// Produces a consistent envelope: { error: { code, message, requestId } }

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "payment_required"
  | "upstream_error"
  | "internal_error";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  rate_limited: 429,
  payment_required: 402,
  upstream_error: 502,
  internal_error: 500,
};

export function newRequestId(): string {
  // Lightweight request id (no external deps).
  return (
    crypto.randomUUID?.() ??
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  );
}

export interface ErrorResponseOptions {
  code: ErrorCode;
  message: string;
  requestId?: string;
  status?: number;
  /** Raw error to log server-side. Never returned to the client. */
  cause?: unknown;
  /** Function name for log prefix. */
  fn?: string;
  /** Extra headers to merge with corsHeaders. */
  headers?: Record<string, string>;
}

export function errorResponse(opts: ErrorResponseOptions): Response {
  const requestId = opts.requestId ?? newRequestId();
  const status = opts.status ?? STATUS_BY_CODE[opts.code];

  if (opts.cause !== undefined) {
    console.error(
      `[${opts.fn ?? "edge"}] ${opts.code} (${requestId}):`,
      opts.cause,
    );
  }

  return new Response(
    JSON.stringify({
      error: {
        code: opts.code,
        message: opts.message,
        requestId,
      },
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-request-id": requestId,
        ...(opts.headers ?? {}),
      },
    },
  );
}

/** Convenience: handle a top-level catch with safe defaults. */
export function internalError(
  fn: string,
  cause: unknown,
  safeMessage = "Something went wrong. Please try again.",
  requestId?: string,
): Response {
  return errorResponse({
    fn,
    code: "internal_error",
    message: safeMessage,
    cause,
    requestId,
  });
}
