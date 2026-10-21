# JowkariTech Catalog Prep — working pilot 0.1

Purpose: one supplier CSV/XLSX -> user-confirmed mapping -> validation and review -> Shopify-format new-draft product CSV. This is a pilot, not a paid subscription launch, certified importer, live-store integration or proven revenue stream.

## Existing website preservation

The app source is isolated in `_catalog-prep/`, an underscore directory not included by the existing Jekyll/GitHub Pages site. The app is deployed to a NEW Cloudflare Worker `jowkari-catalog-prep` on the account's existing workers.dev subdomain. It does not replace the homepage, alter the old editor/support/AI/preview Workers, change DNS, buy a domain or enable a paid plan. Repository secrets already used by deployments supply the Cloudflare token and account ID. The preflight refuses to overwrite an unrecognized Worker with the same name.

## Implemented

- CSV (explicit comma, semicolon or tab; UTF-8) and unencrypted standard XLSX.
- Max 2 MB, 2,000 data rows, 100 columns, 20 worksheets, 20,000 characters per cell; ZIP expansion guard; cancellable parser worker with 10-second timeout.
- One header row at A1; all columns named and unique. Empty records are counted, not hidden. Merged or hidden rows/columns are refused.
- Required mappings: title, text SKU, selling price. Optional: explicit product group, vendor, plain description, three options, one supplied product-image URL per row.
- No grouping by approximate title and no guessed prices. Blank group fields and inconsistent group metadata are blockers. Max 100 variants/group.
- Text SKUs preserve zeros. Numeric/scientific identifiers, mapped formulas and formula-like text block export. User edits in the working copy explicitly replace cell type/formula metadata; the original file is untouched.
- Strict price parsing, explicit decimal convention, separate currency-review note, no currency conversion. XLSX number prices use stored values; date/error/boolean cells block export.
- Source table (25 rows/page), manual edits, change log, validation report, first-row output preview, complete-group test export and full export.
- Generated `cp-` handles, published=false and status=draft. All blockers prevent all exports; there is no silently partial catalogue.
- Optional browser-local mapping save/load/forget; no row values/filename persist. Source files remain in browser memory, never uploaded. Reload discards the working file.
- No analytics, remote image fetches, AI calls, file-storage API, store writes or payment endpoints. Worker rejects methods other than GET/HEAD. CSP prevents external subresources. The host still processes ordinary HTTP connection metadata.
- Working email contact for asking about a scoped pilot; no payment, booking or form-delivery claim.

## Not implemented / not verified yet

No real Shopify development-store import has been performed. Generated output matches the researched fields and is tested with synthetic files, but store-side acceptance is a separate launch gate. No merchant files have been used. No live billing, login, quotas, entitlements, subscriptions, inventory, locations, updates, tax/shipping rules, automated image checks, PDF or scanned-document processing. This is not an AI document-conversion service.

Before a paid launch:
1. Obtain two or three permissioned/redacted supplier examples and expected output. Do not publish files, client details or credentials in this public repo or tests.
2. Connect only a dedicated Shopify development store, not a customer's live store. Test 3 complete products including multiple variants, exact SKUs and prices, product images and draft status; inspect and compare the imported products. Grant only needed product access and revoke after testing. Keep overwrite-matching-handles disabled.
3. Confirm the offer, scope, currency, usage limits and refund/cancellation terms. A Stripe connection or owner-created payment link is needed to take card payments; a paid recurring app also needs server-verified billing/entitlement handling, not a client-side flag. Never paste secret keys in chat or code.
4. Add a custom app subdomain only after verifying DNS rights and deciding the public URL. The current app is noindex until real-file and store testing is complete.
5. Do not promise compatibility with all suppliers, a guaranteed import, rankings or revenue. Review unsafe numeric identifiers rather than reconstructing missing digits.

## Tests and deployment

`node --test _catalog-prep/tests/core.test.mjs`
`python _catalog-prep/build.py` (vendors pinned SheetJS from the official CDN, license and provenance hashes)
`python _catalog-prep/tests/browser.py`

The `Catalog Prep pilot` GitHub workflow also runs existing model/Studio tests and repository-preservation checks. It deploys only after QA succeeds, using an exact tested commit. Production browser checks use synthetic files only and never write to any store or charge anyone. Logs report test names, not customer data. The rollback is to redeploy a previously verified app commit; the original JowkariTech site is independent.

## Primary specifications researched 2026-10-21

- Shopify product CSV fields, draft/publication values and dependencies: https://help.shopify.com/en/manual/products/import-export/using-csv
- Shopify import warnings and development-store test recommendation: https://help.shopify.com/en/manual/products/import-export/import-products
- SheetJS official browser distribution and vendoring: https://docs.sheetjs.com/docs/getting-started/installation/standalone/
- SheetJS cell types and formula metadata: https://docs.sheetjs.com/docs/csf/cell/
- Cloudflare static assets and workers.dev deployment: https://developers.cloudflare.com/workers/static-assets/get-started/
- GitHub Pages commercial SaaS limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Third-party parser code is vendored under its original license with an exact version and SHA-256 provenance file. It is not generated or claimed as JowkariTech's original code.
