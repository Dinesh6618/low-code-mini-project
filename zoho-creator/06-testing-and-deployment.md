# 06 · Testing and deployment

## What has been tested, and what has not

| Layer | Status |
|---|---|
| Business rules (stock, totals, idempotency, cancellation, roles, image records) — **prototype** `prototype/js/db.js` | ✅ 23 automated tests pass (`node --test prototype/tests/logic.test.js`) |
| Storefront + admin UI — **prototype**, real browser, full journey | ✅ 117 browser checks pass (`prototype/tests/e2e/`, see its README) |
| Deluge scripts and Creator configuration | ⚠️ **Not executed.** Written to Deluge syntax; must be run in your Creator account |

The prototype implements the same rules as the Deluge, so its tests double as a precise specification of the behaviour to verify in Creator.

## QA checklist for the Creator build
Run in **Development** with three test users (Customer, fulfilment Staff, Admin). Tick each only after you have seen it work.

**A. Catalogue and variants**
- [ ] Product_Catalogue shows only `Active` products; photographs render
- [ ] A variant with `Stock_Qty = 0` cannot be added to the bag (Cart_Items validate)
- [ ] `Stock_Qty` cannot be edited directly by Staff (field is read-only)

**B. Checkout (COD)**
- [ ] Submitting `Orders` with an invalid phone or PIN shows the alert and saves nothing
- [ ] Quantity above stock is refused with the "Only N left" message
- [ ] A tampered `Total`/`Unit_Price` in the request is ignored (totals recomputed)
- [ ] Order gets a unique `BF-######` number; status **Confirmed**, `Payment_Status` **Pending**
- [ ] `Stock_Qty` drops by exactly the ordered quantity; one *Sale* row per line in `Inventory_Movements`
- [ ] `Order_Items` hold name / variant / SKU / unit-price snapshots
- [ ] Editing the product's name and price afterwards does **not** change the stored order lines
- [ ] Delivery fee applies below the free-delivery threshold; a valid promo code reduces the total

**C. Online (simulated) payment**
- [ ] New order is **Pending Payment**; stock is **not** deducted yet
- [ ] Setting the `Payments` row to *Paid* confirms the order and deducts stock once
- [ ] Setting it to *Paid* again (or re-saving) does **not** deduct again
- [ ] An unpaid order is cancelled by the schedule after the timeout, with no stock change

**D. Fulfilment**
- [ ] Staff with fulfilment rights: Packed → Shipped (tracking required) → Delivered works; skipping a step is refused
- [ ] Delivering a COD order marks the payment **Paid**
- [ ] Customer receives the in-app notification (and email, once configured) for Confirmed, Shipped, Delivered
- [ ] Customer sees the new status in `My_Orders`

**E. Cancellation**
- [ ] Customer cancels a Confirmed/Packed order → status **Cancelled**, stock restored **once**
- [ ] A second request on the same order is refused; ledger shows a single *Cancellation Restock*
- [ ] Shipped/Delivered orders cannot be cancelled by the customer
- [ ] Cancelled order shows separately from the four-step timeline; refund status is **Refund Pending** if it had been paid

**F. Permissions (try them, don't assume)**
- [ ] Customer A cannot open Customer B's order (direct URL, report filter, API)
- [ ] Customer cannot open `Orders_Admin`, `Staff_Members`, `Store_Settings`, sales reports
- [ ] Fulfilment-only staff cannot open Products/Inventory or run *Stock_Adjustments*
- [ ] Product-only staff cannot ship or cancel orders
- [ ] Only Admin sees sales, analytics and settings; the last active admin cannot be removed

**G. Inventory and alerts**
- [ ] A stock adjustment through `Stock_Adjustments` writes a ledger row with who/why
- [ ] Dropping a variant to the threshold raises **one** low-stock alert; more sales do not repeat it; restocking above the threshold re-arms it
- [ ] For every variant, `SUM(Quantity_Change) == Stock_Qty`
- [ ] Deactivating a product hides it from the storefront; old orders still display correctly

**H. Reports**
- [ ] Daily/monthly sales exclude cancelled orders
- [ ] Best sellers, category sales, low stock, cancelled orders, pending payments all match a manual count

## Deployment (Development → Stage → Production)
1. In Development, finish the checklist above.
2. **Deploy to Stage** (if your edition has Environments). Re-run sections B, D, E, F with real mailboxes. Confirm the email sender and a test message.
3. Take a backup/export of Stage, then **Deploy to Production**.
4. In Production: remove demo data, create real `Staff_Members`, set `Store_Settings`, run `bf.backfillOpeningStock()` **only** if you import opening balances, and re-test one real COD order end to end.
5. Do not enable a real payment gateway without a separate, documented test pass.

If your edition has no Environments: build in a copy of the app, test there, then re-create or re-import into the live app, and keep a dated export before each change.

## Known limitations to state honestly
* No real payment gateway; no SMS/WhatsApp; courier tracking is manual entry.
* Two executions that begin in the same instant can both pass a record-flag check; the ledger check in each stock function is the second guard. For very high volumes, serialise order confirmation through one scheduled worker.
* Plan/edition limits (portal users, API calls, email volume, schedules) are unverified — see `01-feasibility.md`.
