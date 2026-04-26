---
name: Edge Function Error Envelope
description: Shared error helper at supabase/functions/_shared/errors.ts returns { error: { code, message, requestId } } with x-request-id header
type: feature
---
All edge functions import from `../_shared/errors.ts`:
- `corsHeaders` — standard CORS map
- `newRequestId()` — generated once per request, before the try block
- `errorResponse({ fn, code, message, requestId, cause? })` — for known errors (rate_limited, payment_required, bad_request, etc.)
- `internalError(fn, e, safeMessage, requestId)` — for top-level catch; logs raw error, returns generic safe message

Response shape: `{ error: { code, message, requestId } }` plus `x-request-id` header.
Error codes: bad_request, unauthorized, forbidden, not_found, rate_limited, payment_required, upstream_error, internal_error.
