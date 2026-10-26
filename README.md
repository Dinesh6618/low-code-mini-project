# BoutiqueFlow — luxury boutique ordering system

A Low-Code Development mini-project: a premium online boutique with a customer storefront, checkout, order tracking, an admin dashboard, inventory control and role-based access.

The repository has two parts that implement the **same rules**:

| Part | What it is | Status |
|---|---|---|
| [`prototype/`](prototype/) | A complete, responsive, working storefront + admin that runs in any browser (no build, no server). It is the design reference **and** an executable specification of the business rules. | ✅ Tested (below) |
| [`zoho-creator/`](zoho-creator/) | The Zoho Creator build: data model, Deluge scripts, workflows, permissions, setup guide, feasibility check, import data. | ⚠️ **Not run in a Creator account** — written to the platform's syntax, to be configured and tested by you |

## Run the prototype
Open [`prototype/index.html`](prototype/index.html) in a browser (double-click it). Everything is stored in the browser's `localStorage`.

Demo accounts (password `demo1234`; the login page also has one-click buttons):

| Role | Email | Can do |
|---|---|---|
| Customer | `customer@boutiqueflow.demo` | shop, own orders, addresses, cancel eligible orders |
| Staff — fulfilment only | `fulfilment@boutiqueflow.demo` | orders, customers, status updates |
| Staff — products + fulfilment | `staff@boutiqueflow.demo` | the above plus products, inventory |
| Admin | `admin@boutiqueflow.demo` | everything, plus staff, sales reports, settings |

You can also check out as a guest, and track an order with its number and email at `#/track`.
Admin → Settings → *Reset demo data* restores the sample data.

### Photography
The storefront shows **real photographs** — no illustrations or drawings anywhere. 20 of the 25 sample products, the home-page hero and the "Our story" section carry free-to-use [Pexels](https://www.pexels.com/) stock photographs (sources in [`prototype/assets/products/CREDITS.md`](prototype/assets/products/CREDITS.md)); the other five (Tussar saree, silk-blend kurti, peplum top, scarf, clutch) had no suitable licensed photo and show a clean **"photograph coming soon" placeholder**, as does any photo that fails to load.

**These are sample images, not your inventory.** They show similar garments on a mix of models, never the actual item, and the site says so: a "Sample photograph" label on the product page, a note on the catalogue, and a footer line. Don't present them as real stock — replace them with your own photography before selling.

* **Per product** each record holds its images (`{ src, color, alt, sample }`): the first is the main image used in the catalogue, bag and product page, the rest form the clickable gallery. A photo can be tagged with a colour so it shows when that colour is chosen.
* **Admin → Products → Edit** has *Upload main image*, *Add gallery images* (resized automatically), *Add link* for an `https://` image, *Make main*, and a per-photo colour tag.
* **From a folder:** put images in `prototype/assets/products/<product-slug>/` (and `assets/hero/` for the home-page hero), run `node tools/build-photo-manifest.js`, refresh. See [`prototype/assets/products/README.md`](prototype/assets/products/README.md).
* **Use only images you have the right to publish** — not photos copied from other shops or search results.
* Back views and fabric close-ups are supported (any number of photos per product) but the sample set has only one or two per product, because licensed stock rarely shows the same garment from several angles.

## What is implemented (prototype)
* **Storefront:** a compact header (category navigation that follows the live catalogue, search, account, **wishlist**, bag); a single-photograph hero with one action; photographic thumbnails for seven categories (Sarees, Kurtis, Dresses, **Lehengas**, **Ethnic Sets**, Tops, Accessories); new arrivals with in-stock sizes shown on every listing; one asymmetric editorial section ("The wedding edit", built from real catalogue pieces); a short story; footer; a catalogue with a category pill bar, a "Refine results" panel and a product side panel (see below); product page with gallery and zoom, valid-only size and colour selection, size guide, care, delivery estimate, related and recently viewed; bag drawer and page; promo codes; four-step checkout (Bag → Delivery → Review → Confirmation) with guest checkout, Cash on Delivery and a clearly labelled **simulated** payment; unique order numbers.
* **Account:** profile, saved addresses, orders, a Confirmed → Packed → Shipped → Delivered timeline, separate cancellation state, payment status, cancellation when eligible, guest tracking.
* **Admin:** dashboard cards, searchable/filterable orders with status actions and shipping details, products (photos, colours, sizes, per-variant stock, sale price, activate/deactivate), categories, inventory with adjustments and movement history, low-stock alerts, customers, staff and permissions, reports (daily/monthly sales, volume, best sellers, category sales, low stock, cancelled, pending payments, CSV export), notifications, settings, promo codes.
* **Rules:** stock is validated at bag, checkout and confirmation; deducted exactly once; restored exactly once on cancellation; prices, names and variants are frozen on each order line; roles and ownership are re-checked inside every data call, not just in the menu.

### Design decisions
The interface is deliberately plain: square-edged photographs, hairline borders instead of shadows, sentence-case navigation and buttons with no wide letter-spacing, and a small type scale (serif only for page and section titles; sans for names, prices, forms and navigation). There are no carousels, gradients, glow effects, "New" or discount badges (a **Sale** label appears only on pieces that really have a sale price), or repeated banners. Listings show the name, the real price, the sizes that are actually in stock (sold-out sizes struck through), colour dots and a discreet wishlist heart. The home page is not a stack of identical card rows: the editorial band is a different shape (a photograph that breaks out of its band beside a short "shop the look" list). The wishlist is kept per browser and merges into a customer's account when they sign in.

### Catalogue UI (`#/shop`)
Modelled on large marketplace shopping pages, in the BoutiqueFlow palette:
* **Pill bar:** a dark filter button, category pills (All, Sarees, Kurtis, Dresses, Tops, Accessories, Festive Edit, On sale) and a scroll arrow.
* **Refine results** (collapsible groups with checkboxes; selections are links, so every filtered view is shareable): Features (in stock, on sale, plus product features such as *For weddings*, *Handloom*, *With embroidery*), Style, Price (bands plus a **Min / Max "Go"** form), Length, Silhouette, Size, Colour (swatches), Pattern, Material, Neckline, Sleeve type, Embellishment. Several values in a group mean "any of"; different groups combine with "and"; ticked features must all be present. Long lists show five options with *See more*. Active filters appear as removable chips.
* **Sort by:** Relevance (search-word matches first, then most popular), Newest, Popularity, Price low→high, Price high→low.
* **Product side panel:** clicking a card opens the product beside the grid — large photograph with close / enlarge buttons, thumbnails, name, price, boutique and delivery line, colour and size pickers with sold-out options disabled, Add to Bag. (Full-screen sheet on phones; *View full details* opens the complete product page.)
* Each product's filter attributes are edited in **Admin → Products → Edit → Attributes for filters**; new values appear in the filters automatically.

**Deliberately not included** (they don't fit a single boutique, or would need data that doesn't exist): *Shops* and *Brand* (there is one seller), *Age group / Girls' / Maternity / Plus-size* (not part of this range), *Department* (everything is women's wear), and **Sort by Rating** — ratings need real customer reviews, and I won't fabricate them. Reviews and ratings would be a sensible next feature.

## Tests (what was actually run)
```
node --test prototype/tests/logic.test.js     # 23 business-rule tests
```
Covers: seed integrity (inventory ledger = stock), filters and sorting, sold-out variants, stock limits in the bag, totals / delivery / promo, validation, COD and simulated-payment checkout, **no double deduction on repeated confirmation or payment callbacks**, oversell protection, **no double restore on repeated cancellation**, status transitions, notifications, low-stock alerts firing once, roles and ownership, deactivation without breaking history, product validation, report totals.

The UI is also driven end to end in a real browser (Microsoft Edge via `puppeteer-core`; scripts in [`prototype/tests/e2e/`](prototype/tests/e2e/)): browse → filter → select variant → bag → checkout → order number → stock check → staff fulfilment → customer tracking → cancellation → permission checks → admin tools, plus the photography rules (no illustrations, different photo per product, same photo in catalogue / product page / bag, placeholder when missing or broken, admin image tools, the filter panel, Min/Max price form, side panel) — **117 checks passed**, and a separate sweep found **no horizontal overflow on any of 25 routes at 390 / 820 / 1440 px**.

## What is *not* real
* No payment gateway: "Card / UPI" is a **simulation** and is labelled so everywhere. Cash on Delivery is the only genuine path.
* No email or SMS is sent. Notifications are in-app rows marked "email (simulated)".
* The prototype's "server" is JavaScript in the browser, so its security is a demonstration. Real enforcement comes from Zoho Creator profiles and Deluge (see `zoho-creator/04-roles-and-permissions.md`).
* The Deluge scripts and Creator configuration have not been executed.
* Plan/edition limits for Zoho Creator (portal users, API, environments) are unverified — see `zoho-creator/01-feasibility.md`.

## Layout
```
prototype/
  index.html            entry point
  assets/styles.css     design system (tokens: ivory, espresso, burgundy, champagne)
  assets/products/      product photographs per slug + README + CREDITS (sources of the samples)
  assets/hero/          home-page hero photographs
  js/seed.js            demo catalogue
  js/db.js              data layer + business rules (mirrors the Creator forms/Deluge)
  js/ui.js, store.js, admin.js, app.js          views and router
  tests/logic.test.js   business-rule tests     tests/e2e/   browser tests (puppeteer-core)
  tools/                photo-manifest builder
zoho-creator/
  README.md             start here
  01-feasibility.md  02-data-model.md  03-setup-guide.md  04-roles-and-permissions.md
  05-storefront-pages.md  06-testing-and-deployment.md
  deluge/functions.dg   deluge/workflows.dg
  seed-data/            CSV imports (+ generate-csv.js)       widget/  Creator JS API adapter (starter)
```
