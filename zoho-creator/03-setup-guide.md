# 03 · Setup guide (Zoho Creator)

Work in the **Development** environment if your edition has environments; otherwise build in a copy of the app. Budget roughly half a day for Tier A. Nothing below has been run against a live account — treat each step's "Check" as a gate before moving on.

## 0 · Before you start
1. Sign in at creator.zoho.com (use the data-centre domain of your account, e.g. `.in`, `.eu`).
2. Confirm the **Verify** rows in `01-feasibility.md` for your edition.
3. Decide: Tier A only, or Tier A + the Tier B storefront page.

## 1 · Create the application
1. **Create Application → From scratch**, name it `BoutiqueFlow`.
2. Settings → set **Time zone** `Asia/Kolkata`, **Date format** `dd-MMM-yyyy`, currency INR.

## 2 · Build the forms (order matters because of lookups)
Create forms exactly as specified in `02-data-model.md`, in this order:

1. `Categories`, `Colours`, `Store_Settings`, `Promo_Codes`, `Staff_Members`
2. `Products`, then `Product_Variants`
3. `Customers`, `Addresses`, `Carts`, `Cart_Items`
4. `Orders` (create the **Order_Items** subform inside it), `Payments`, `Cancellation_Requests`, `Ship_Order`
5. `Inventory_Movements`, `Stock_Adjustments`, `Notifications`

Field notes:
* `Order_Number`: field type **Auto number**, prefix `BF-`, starting value `100001`.
* Mark the fields tagged **RO** in the data model as *read-only* and the **Hid** ones as *hidden*.
* Add the field validations (patterns, min values, unique) from the tables.

**Check:** add one Product, one Colour and one Variant by hand; the lookup pickers show the right display names.

## 3 · Import the demo catalogue (optional but recommended)
Files are in `seed-data/` (regenerate with `node seed-data/generate-csv.js`).

Import with **Form → Import data** in this order: `Categories`, `Colours`, `Products`, `Product_Variants`, `Promo_Codes`, `Store_Settings`, `Staff_Members`.
* Map lookup columns (`Category`, `Product`, `Colour`) by **display value**.
* Edit `Staff_Members.csv` first — replace the placeholder emails with the real login emails of your testers.
* The `Product_Variants.csv` loads 10 units per variant. After the import, run `bf.backfillOpeningStock()` once (Functions → Execute) so the ledger matches stock.

**Check:** `Product_Variants` shows 170 rows; `Inventory_Movements` shows one *Opening Stock* row per variant; the sum of `Quantity_Change` per variant equals `Stock_Qty`.

## 4 · Install the Deluge
1. Settings → **Functions** → create each function from `deluge/functions.dg` (namespace `bf`).
2. Workflow → **Form workflows**: create each block of `deluge/workflows.dg` on the form/event named in its banner (On Validate, On Success…).
3. Workflow → **Schedules**: the two schedules at the end of `workflows.dg` (every 10 minutes; daily 08:00).
4. Reports → `Orders_Admin` → **Actions → Custom action**: create *Mark as packed*, *Mark as delivered*, *Cancel order* from the "Custom action" block.
5. Save and fix any syntax warnings Creator highlights. Common ones: a link name that differs from your field, or a lookup compared without `.toLong()`.

**Check:** Settings → Functions → run `bf.hasPermission("<your email>","admin")`; it should return `true`.

## 5 · Reports and dashboard
1. Build the reports in the *Reports to create* table of `02-data-model.md`.
2. **Admin dashboard page**: Pages → New page. Add KPI/Number components (Orders, Sales this month, Pending fulfilment, Low stock), a column chart on `Daily_Sales`, and the `Orders_Admin`, `Low_Stock` reports as embedded components. Keep it to useful components — no decorative charts.
3. **Branding**: set the theme to ivory `#F8F5F0`, espresso `#29231F`, burgundy `#672C3A`, with a serif heading font (Cormorant Garamond via Settings → Themes → custom font or the page's CSS).

## 6 · Roles
Follow `04-roles-and-permissions.md` to create the Customer / Staff / Admin profiles and invite three test users (one per role) with real, reachable mailboxes.

## 7 · Customer experience
* **Tier A:** publish `Product_Catalogue`, the `Orders` form, `My_Orders`, and `Cancellation_Requests` to the Customer profile (portal or permalink, per your edition).
* **Tier B:** follow `05-storefront-pages.md`.

## 8 · Email
Settings → Email → configure a sender (or use `zoho.adminuserid`). Send one test through `sendmail` from the Deluge console before relying on notifications. **Do not tell customers emails are sent until this passes.**

## 9 · Payments
The shipped flow is **Cash on Delivery** plus a clearly labelled *simulated* online payment (marking `Payments.Payment_Status = Paid` triggers confirmation and the stock deduction). To go live you must add a real gateway and a webhook (see `01-feasibility.md`) — until then the label "simulated" must stay visible.

## 10 · Go to staging / production
See `06-testing-and-deployment.md`.
