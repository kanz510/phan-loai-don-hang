# Wave 2: Mobile orders & sync optimization (TEST ONLY)

**Branch:** `test/wave2-mobile-sync-20261104` based on Wave 1 `test/wave1-data-integrity-20261103`, not main. Do not merge until explicitly approved.

## Scope and what changed

- Under 540px, the existing order table appears as compact cards. Customer/product, monetary totals, delivery status, quick **Sửa** and (when applicable) **Đã giao** remain visible.
- **Xem chi tiết / Thu gọn** toggles extra fields such as date, payment method, note, and secondary Hủy/Xóa actions. Toggle has `aria-expanded`; focused button is a real `button`. The disclosure stays open across ordinary background rerenders.
- Search input is debounced by 160ms. Enter/blur flush the pending search. Filter state and pagination still live in the URL.
- Supabase Realtime events are debounced (450ms), overlapping refreshes are coalesced, pending changes during a local save are refreshed afterward, and tabs returning to foreground recheck when stale.
- Fallback polling changes from 15s to 60s while the document is visible. It remains a **full-list** sync as a safety net, not server-side delta pagination. Unchanged records skip DOM rerender.
- No schema, order mutations, API/provider configuration, AI tools, or production deployment changes in Wave 2.

## Isolation requirement

**The code still includes the live Supabase URL in `app.js`.** A separate GitHub branch does not isolate the database. Do not host this test UI against production to click write actions. Use the separate test project described in `WAVE1_TEST.md` and synthetic data; update `SUPABASE_URL` and public anon key in this branch for that environment. Anon keys are public; never put service-role credentials in the browser.

## Tests to run

```sh
node tests/wave2-sync.cjs
node tests/wave1-ranking.mjs
node tests/wave1-states.cjs
node tests/ai-chat.mjs
node tests/schema.cjs
node tests/regression.cjs
```

The Playwright test is extended to check a 390px viewport, collapsed note visibility, expanded details, `Sửa`, no horizontal document overflow, preservation of disclosure after rerender, and a burst of scheduled sync updates. The existing browser regression also checks 375/768/1440px.

Manual checks on **iPhone 16 Pro Max Safari** (or Safari responsive mode):
1. Open Orders with synthetic records and verify primary button is not over the customer's name, even for long names.
2. Open/close `Xem chi tiết`; edit and return to the same list filter/page. Confirm Hủy and Xóa need confirmation and only act on test records.
3. Search a long customer name, clear filters, sort by value, toggle Chưa Hoa Hồng, switch month/year and date range.
4. In separate test sessions, edit a record in one and verify Realtime update in the other; return from background to recheck and confirm that a failed sync shows a warning.
5. Test with reduced motion and iPhone keyboard open; verify no sideways scroll.

## Verified / not verified

- GitHub branch edits were checked for JS syntax and sync behavior with a deterministic mock (bursts, busy queue, in-flight update, no unnecessary rerender).
- This work has **not** executed a full Chromium/Playwright run, iPhone Safari session, or against a live Supabase test project. Do not treat the branch as production-ready.
