# BoutiqueFlow on Zoho Creator

Everything needed to build the boutique in Zoho Creator, mirroring the working prototype in `../prototype/`.

> **Status — read this first.** None of this has been run in a Zoho Creator account. The Deluge is written to Deluge syntax and the configuration to Creator's feature set, but I had no tenant to test against. Treat the steps as a precise plan and the scripts as a first draft: build in a *Development* environment and work through `06-testing-and-deployment.md`. Where something depends on your plan or edition it is marked **Verify**.

## Read in this order
1. [`01-feasibility.md`](01-feasibility.md) — what Creator does natively, what needs a custom page/widget/API, what is external and not built.
2. [`02-data-model.md`](02-data-model.md) — every form, field, lookup, rule and report (link names the scripts rely on).
3. [`03-setup-guide.md`](03-setup-guide.md) — build order, imports, installing the Deluge, dashboard, email.
4. [`04-roles-and-permissions.md`](04-roles-and-permissions.md) — Customer / Staff / Admin, enforced by profiles **and** by Deluge.
5. [`05-storefront-pages.md`](05-storefront-pages.md) — the premium storefront as a Page + Widget, guest checkout options.
6. [`06-testing-and-deployment.md`](06-testing-and-deployment.md) — QA checklist and Dev → Stage → Production.

## Files
| Path | Purpose |
|---|---|
| `deluge/functions.dg` | `bf.*` functions: `adjustStock`, `checkLowStock`, `confirmOrder`, `cancelOrder`, `advanceStatus`, `hasPermission`, `notify`, `backfillOpeningStock` |
| `deluge/workflows.dg` | form workflows (orders, payments, cancellation, shipping, stock, products, cart, staff), custom report actions, schedules |
| `seed-data/*.csv` | demo catalogue, colours, variants, promo codes, settings — generated from the prototype's data |
| `widget/boutiqueflow-adapter.js` | starter mapping of the prototype's API to the Creator JS API (untested) |

## How the rules map

| Requirement | Where it lives |
|---|---|
| Automatic price and total calculation | `Orders > On Validate` (recomputed from the database; client values ignored) |
| Required-field validation | field settings + `Orders > On Validate` |
| Stock availability checks | `Cart_Items`, `Orders > On Validate`, and again in `bf.confirmOrder` |
| Unique order number | `Order_Number` auto-number field (`BF-` + 100001…) |
| Inventory deduction after confirmation/payment | `bf.confirmOrder` → `bf.adjustStock` (once; flag + ledger guards) |
| Stock restore for eligible cancellations | `bf.cancelOrder` (once; flag + ledger guards) |
| Confirmation / shipping / delivery notifications | `bf.confirmOrder`, `bf.advanceStatus` (in-app + `sendmail`) |
| Low-stock alerts | `bf.checkLowStock` + daily digest schedule |
| Role and ownership checks | profiles + `bf.hasPermission` + `zoho.loginuserid` tests |
