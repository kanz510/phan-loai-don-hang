# Frontend structure

Deferred classic scripts load in this order: utilities, auth/sync, statistics, order list/actions/CSV, form, and app bootstrap. This deliberately preserves the existing shared lexical bindings used by Em Kem; there is no new framework or bundler.

- app-utils.js: DOM helpers, money, Vietnam dates, search normalization, validation.
- app-auth.js: authentication, membership checks, sync, notifications and busy state.
- app-stats.js: dashboard cards and summary.
- app-orders.js: date/status/search filters, sorting, pagination, rows, existing quick actions and CSV.
- app-form.js: add/edit initialization, validation and saving.
- app.js: public Supabase configuration, shared runtime state and startup/coordinating render.
- shared-cloud.js: unchanged Supabase API adapter.

## Automatic release version

Keep the existing Pages source (main/root). Its built-in pages build and deployment Action already runs Jekyll. All four HTML entry points have front matter and use `site.github.build_revision | slice: 0, 8` for app-version and every local JS/CSS URL, including the vendored SDK and updater. The SHA is the commit actually built; a second push therefore creates a new cache key without editing versions. Do not replace this expression with a hand-written value. No Pages setting or secret is needed.

Run `node tests/frontend.mjs` for syntax and four-page regression checks. For a raw local static server, render the Liquid version expression to a single dev value and strip front matter first, or use Jekyll. Do not open the unrendered template as the deployed site.

app-update.js continues checking fresh HTML on launch/resume and delays reload for unsaved form inputs or an active chat request. It does not clear authentication or conversation storage. No service worker or offline order cache is introduced.

## Verified release checks

First deployed refactor: cfd2764d (PR #17). Live admin checks: 39 orders, total 16,938,000 VND, commission 935,000 VND; pending filter 6/39; unaccented search ngoc quynh 1/39 within pending; page 2/4 has 10 rows; descending amount starts at 1,480,000 VND; CSV download completed with UI confirmation of 39 orders. Add-order form loaded enabled without submitting; account page loaded signed in. All observed asset URLs use cfd2764d, including the vendored SDK. No order writes were made.

The subsequent helper-comment commit is an intentional cache smoke test: it changes a JS file without changing behavior or touching a version string. Verify the next build's meta and every asset URL change to its short commit SHA on the already-open tab after resuming.
