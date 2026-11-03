# Wave 1 test plan (branch only)

Branch: `test/wave1-data-integrity-20261103` from `main`.

**Isolation:** This branch is NOT deployed to production, is NOT merged into main, and does NOT execute SQL automatically. The repo's existing `app.js` still points at the LIVE Supabase project until you deliberately swap it for a separate test project on this branch. **Do not open a writable branch preview using production credentials.** Never run the migrations on the live Supabase project during evaluation.

## What changed

1. **Em Kem**: `query_orders` now supports `group_top` (1–50) and `group_sort` (`order_count`, `active_value`, `commission`). Top rankings are computed over *all* matching records, not only the first page of groups. Existing full-list pagination and the incomplete-coverage warning remain in place. More than 50 groups cannot currently be listed in one response.
2. **Audit**: `supabase-order-history.sql` upgrades the history table and trigger to record `DELETE`, retaining the deleted snapshot in `before_data` and leaving `after_data` null. The account history panel now displays deletions. This does **not** implement an undo/restore action.
3. **Commission & collection**: `supabase-wave1-status.sql` adds nullable `commission_state`, `commission_expected` and `collection_status`, without rewriting old orders or versions. After migration, order forms expose these states. CSV exports add the three fields at the **end**. The pending commission count excludes cancelled orders and orders explicitly marked `not_applicable`.
4. **Backward compatibility**: if optional columns are missing, the app hides new form inputs, reads the old schema, and keeps the original editing workflow. Legacy orders without state use inferred display states: commission 0 → `pending`, nonzero → `received`; legacy method `Chưa thanh toán` → collection `Chưa thu`. This inference is *not* a database backfill.

## How to test safely

1. Create an **independent Supabase test project**, add only synthetic orders and test accounts. Apply the existing schema/member grants as documented in `DEPLOYMENT.md`, then `supabase-order-history.sql`, `supabase-wave1-status.sql` and `supabase-ai-chat.sql` in the **test** SQL Editor.
2. In this **test branch only**, change `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `app.js` to the test project public values. The anon key is not a secret, but **never** place a `service_role` key in frontend code.
3. Deploy `supabase/functions/order-chat/index.ts` to the test project only. Configure `GROQ_API_KEY` (and optionally `XKIRO_API_KEY`) in test Edge Function Secrets. Set `APP_ORIGIN` for the isolated preview origin.
4. Host a preview of this branch separately from the production Pages build. GitHub Pages for `main` does not automatically preview this branch.
5. Use synthetic test orders: (a) pending 0; (b) not applicable 0; (c) partial received 50,000 VND / expected 100,000 VND; (d) fully received 50,000 VND; and (e) cancelled pending. Check the commission filter and reminder count, list display, form save/reload, and exported CSV.
6. Check independent payment method and collection status, for example method CK with collection `Chưa thu`, then `Đã thu`. Verify old `Chưa thanh toán` values survive an edit.
7. Create, update, and delete one **synthetic** order. In Account → History, confirm all three events, actor/time and original fields in the deletion record.
8. Give Em Kem at least 123 distinct synthetic customers. Ask for “top 5 khách theo giá trị đơn” and “top 5 khách theo hoa hồng”; cross-check the exact ranks with filtered data. Full listings of more than 50 groups must still be clearly marked incomplete until pages are fetched.
9. Check iPhone Safari viewport, modal add form, page reload, concurrent edits, logout/login, and expired session.

## Local automated checks

```sh
node tests/wave1-ranking.mjs
node tests/ai-chat.mjs
node tests/ai-quota.cjs
node tests/regression.cjs
node tests/schema.cjs
```

The last three commands require the dev dependencies described in `README.md`; CI/browser/database testing was not performed as part of the GitHub connector edits. No production database mutation has been made.

## Acceptance gates before requesting merge

- All Node tests pass and the browser test passes on real/simulated iPhone.
- Test project confirms optional SQL migration and the deleted-order trigger.
- No old order amount, received commission amount, version or member permission changes during migration.
- Provider, CORS origin and frontend settings all target the **test** stack.
- Only after review, separately decide if and how production migration/deploy should occur.
