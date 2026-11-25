---
name: project-review-gotchas
description: Non-obvious validation/auth behaviors in backend_order that recur in reviews (bodymen nested objects, partner order PUT, outbox queue)
metadata:
  type: project
---

- bodymen (with `model.schema.tree.X` nested defs) does NOT validate sub-fields: nested objects pass through as arbitrary Object; `Number` accepts floats unless validated. Only Mongoose save validates.
- Partner router (`/public/bizs/:alias/...`, bizToken) exposes order PUT with `orderUpdateModel` incl `isPaid`/`status`/cart, and GET index of all biz orders. Any feature relying on isPaid/status integrity must consider this.
- `token()` middleware decodes JWT payload without verifying before cache lookup (cache key = payload id) — pre-existing.
- ManageQueue outbox (src/services/queue/run.js) has no reaper for jobs stuck in PROGRESS and no built-in retry; workers must self-retry.

**Why:** found during flash-sale MVP review 2026-11-25; these silently undermine invariants new features assume.
**How to apply:** check these whenever reviewing features touching order payment/status, input schemas, or queue jobs.
