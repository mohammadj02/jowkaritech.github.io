# JowkariTech remote IT support — operations and measurement

## Release scope

The existing GitHub Pages site is extended, not replaced. Remote support is an appointment-request workflow. It does not automatically book a calendar slot, take a payment, install a remote-control tool, create a CRM account, or promise a repair. Existing website-builder files, demos, AI/preview Workers, ownership verification and domain configuration are preserved by hash checks.

The source of the service scope and pricing is the owner-provided brief, October 15, 2026. Founder education is the owner's supplied background, not an independently verified credential badge.

## Delivery path

Browser form → `jowkari-support` Cloudflare Worker → existing Web3Forms owner-notification integration → the configured JowkariTech business inbox.

The frontend has no email-provider credential. The Worker validates the full request, checks consent/ownership, enforces length and enum limits, checks a signed form challenge, applies rate limits and sends to a fixed provider URL. It never accepts a caller-supplied notification recipient or redirect URL. Success is shown only after the provider acknowledges transmission with its successful response. This is not proof that a technician read the email; live release testing checks inbox receipt separately.

### Environment and existing access

Deployment reuses GitHub Actions repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Never paste their values into an issue, source file, screenshot or chat.

Worker secrets:
- `SUPPORT_FORM_KEY`: securely copied from the existing owner-configured Web3Forms integration by the deployment job.
- `SUPPORT_CHALLENGE_SECRET`: securely generated once; preserved on later deployments.

Worker bindings:
- `SUPPORT_STATE`: the existing KV namespace used with a separate `it-support:receipt:` prefix. It stores only an HMAC fingerprint, receipt state and timestamp for up to 24 hours. It does not store names, contact details, descriptions or raw IPs.
- `SUPPORT_RATE`: 5 operations per 60-second window per configured key.
- `CHALLENGE_RATE`: 20 per 60-second window per configured key.

The new Worker has an isolated workers.dev endpoint. This release does not modify DNS, an existing Worker, a billing plan or the existing form destination. A missing binding/secret makes the request form unavailable with an email fallback rather than silently losing enquiries.

### Security and operational limits

Signed challenges plus honeypot, input validation, client confirmation and rate limiting reduce abuse. They are not a guarantee against bots or distributed denial of service. Cloudflare's rate-limit binding is per-location/eventually consistent, not a strict global transaction counter. KV is also eventually consistent; receipt-based duplicate suppression is best effort, not exactly-once delivery across concurrent edge locations. The browser blocks duplicate clicks and automatic retries after ambiguous delivery.

No credentials are requested. Pattern checks catch some accidental secret assignments, but cannot recognize every possible secret in natural-language text. The customer warning and technician handling policy remain essential. If someone sends sensitive material anyway, do not forward or quote it; ask them to secure their account and remove unnecessary copies under the privacy process.

The edge/email providers may process connection and delivery metadata and may process data outside Canada. Do not claim Canada-only hosting. Review the business inbox for unneeded declined or abandoned enquiries after 90 days. That is an owner-managed review, not an installed automatic deletion job. Preserve records needed for active service, disputes or required business recordkeeping.

The request schema allows common English input and Unicode names. It intentionally accepts only supported device/issue/time-zone options. A user behind a shared network may hit a limit and should use the email fallback. Device troubleshooting can still require hands-on work or an account provider.

## Before the first paid session

1. Confirm the real reply inbox is monitored and a test message has arrived. Exclude QA messages from the customer funnel.
2. Set appointment windows that match your actual availability. The site advertises appointments, not immediate or 24/7 response.
3. Choose a screen-sharing product whose current commercial-use terms fit your business and your Ubuntu-to-customer device workflow. Test on an authorized spare device before selling a session. No third-party unattended agent is bundled or installed by this release.
4. Confirm identity/authority, remote suitability, backup needs, the issue, time allowance, CAD total including applicable taxes, payment method and outcome limitations in writing before work.
5. Keep the session attended. Ask the customer to close unrelated documents and stop sharing/recording before they enter any password, verification code or recovery answer on the official provider page.
6. Get explicit permission before changing settings or expanding scope. Stop at the time limit unless further work and price are agreed.
7. Explain the outcome, remove/end remote access, and record only the necessary service/payment information privately.

No online checkout is configured here. Use the payment method agreed with the customer; do not collect card details through a support form, email or remote chat. A submitted preferred time is not a confirmed booking.

## How to measure real customer acquisition

### Search impressions and clicks

Use the connected Search Console property `https://jowkaritech.com/`. Filter by the new service/resource paths. Compare settled multi-week windows. A Search Console impression is not a visit, and an average position across very few impressions is not a broad ranking guarantee. Sitemap acceptance and IndexNow acceptance do not mean the pages have been indexed.

### Site visits and conversion events

No active analytics tag was found in the production source baseline. The support layer does not invent a GA4 ID or load an advertising SDK.

It dispatches the `jowkari:conversion` CustomEvent and pushes to `window.dataLayer` only when that array already exists. The allowed event names are:
- `support_request_click`
- `support_request_submitted` (after provider acceptance)
- `support_pricing_view`
- `support_contact_click`

Payload fields are only `event`, `page` (approved public path) and `channel` (approved source label). It never includes the form contents, private device information, contact details, a raw referrer or URL queries. These hooks are not automatically stored in an analytics account. Connecting an owner-approved analytics property and consent setup is a separate configuration step.

The intake email carries approved source/medium/campaign labels and the source page. Marketing links in `marketing/remote-support-launch.md` use those labels. Keep only non-sensitive labels in campaign URLs. Session storage holds those labels for use within 30 minutes; it never holds a support description.

### Bookings, paying customers and revenue

Keep a private operational ledger, not a file in this public GitHub repository. Recommended columns:

`request_reference | received_date | source_channel | source_page | suitable (yes/no) | appointment_agreed (yes/no) | session_completed (yes/no) | amount_collected_CAD | refunded_CAD | follow_up_due`

Contact information, invoices and necessary service notes belong in your approved private business records, not source control or analytics. Use the request reference to join the private record to the email. Count unique non-QA requests. Do not count a form submission as an appointment, a completed job or revenue.

For each channel, measure: requests → suitable requests → agreed appointments → completed sessions → paying customers → net collected CAD. Net collected revenue is collected CAD minus refunded CAD, not quotes or potential sales. Track hours spent so a C$80 session does not hide excessive unpaid work.

## Search and profile setup

The deployed sitemap preserves the existing pages and adds the remote-support routes. Existing Google/Bing/IndexNow ownership files are not replaced. The release process should resubmit the live sitemap through the connected Search Console and submit the changed public URLs to IndexNow only after verifying its existing key file. Results and any unavailable access must be recorded honestly.

Do not create an online-only Google Business Profile or claim a walk-in North Vancouver address for this remote service. This release makes no Business Profile edits.

## Safe releases and rollback

`remote-it-release.json` lists the generated route changes and the SHA-256 hashes of preserved product/verification files. `.github/workflows/remote-it-release.yml` runs baseline tests, server/unit tests, existing Studio/SEO browser tests, support browser tests and live backend checks before publication. Generated pages are committed only to the feature branch until reviewed.

After promotion, GitHub Pages deploys the static site through its existing workflow. Production checks verify the new routes and one labelled owner-only QA enquiry. A rerun of that workflow skips automatic email resending.

To undo a release, review the commits made after the backup ref and create a normal revert commit. Do not hard-reset or force-push over later legitimate work. Do not delete the existing shared KV namespace to undo the new support Worker; that would affect the website previews.

## Seven-day launch

Use `marketing/remote-support-launch.md` for the six ready-to-edit messages and the seven-day checklist. Marketing messages are drafts only; this release does not post to social platforms or send commercial outreach automatically.
