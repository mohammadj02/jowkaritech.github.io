# Jowkari Sites preview backend

This Worker enforces the real free-preview policy server-side:

- one 30-minute preview per source IP
- a new preview can start 3 hours after the prior preview starts
- preview design data lives in Cloudflare KV for only 30 minutes
- IP addresses are not stored directly; the Worker stores an HMAC-derived key
- CORS is limited to jowkaritech.com

Required Cloudflare setup:
1. Create a KV namespace and bind it as PREVIEW_KV.
2. Create a Worker secret named PREVIEW_SIGNING_SECRET.
3. Deploy preview-worker.js.
4. Point the front-end PREVIEW_API constant to the deployed Worker URL.

Until this Worker is deployed, the current front-end also has a browser-local 3-hour cooldown. That browser control is UX only; real IP enforcement must happen here at the edge.
