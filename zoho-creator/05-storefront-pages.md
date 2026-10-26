# 05 · Storefront pages (Tier B)

Tier A (native forms and reports) already works end to end. Tier B puts the boutique look on top of it.

## How the prototype maps onto Creator

| Prototype screen / call | Creator building block |
|---|---|
| Home, shop grid, filters, product page, bag drawer | **One Creator Page** hosting an HTML/CSS/JS **Widget** (the prototype's `index.html`, `assets/styles.css`, `js/store.js`, `js/ui.js` adapted) |
| `api.products()`, `api.product()` | `ZOHO.CREATOR.API.getAllRecords` on `Product_Catalogue` / `Inventory` |
| Product photographs (`product.images`: main first, then gallery; optional colour tag and sample flag) | `Primary_Image` + `Gallery_Images` subform (add `Colour` and `Is_Sample` columns to the subform). A product with no image shows the neutral placeholder |
| `api.cart*`, bag | browser state for guests; `Carts` / `Cart_Items` for signed-in customers |
| `api.placeOrder()` | `addRecord` on `Orders` with the `Order_Items` subform — **all totals, stock checks and the order number are produced by `Orders > On Validate / On Success`** |
| `api.completeSimulatedPayment()` | `updateRecord` on the `Payments` row → `Payments > On Edit` confirms the order |
| `api.myOrders()`, order timeline | `My_Orders` report (record criteria `Email == zoho.loginuserid`) |
| `api.cancelOrder()` | `addRecord` on `Cancellation_Requests` — the server decides |
| Admin screens | native reports + the dashboard Page (`03-setup-guide.md` §5) — do **not** port the prototype admin |

`widget/boutiqueflow-adapter.js` contains the call shapes. It is a **starter, untested**.

## Build steps
1. Pages → **New page** → add an *HTML snippet* component, or create a Widget (Settings → Widgets) from a zip of `plugin-manifest.json` + `app/widget.html` + the JS/CSS, then embed it in the page.
2. In the widget: load the SDK, call `ZOHO.CREATOR.init()`, then render. Replace every `BF.api.*` call in `store.js` with the adapter equivalent (the adapter returns promises; the prototype's calls are synchronous, so views need `await`).
3. Remove from the bundle: `db.js`, `seed.js`, `admin.js`, `tests/` — the data layer and admin are replaced by Creator.
4. Fonts: Cormorant Garamond + Jost (Google Fonts) load from the widget's CSS; check your widget CSP settings allow them.
5. Publish the page to the Customer profile (portal) — or, for browsing without sign-in, publish `Product_Catalogue` with a public permalink and put sign-in at checkout.

## Guest checkout
Anonymous visitors have no API session. Options, in order of simplicity:
1. Require sign-in only at checkout (portal self-registration); keep browsing public.
2. Publish a **public form** for `Orders` (permalink) and link to it from the bag.
3. Expose a **Custom API** (Deluge) `placeOrder` endpoint with an API key. *Verify availability on your edition.* The endpoint must call the same validation logic — do not copy a second, looser version.

Tracking for guests: a small public form `Track_Order` (Order number + Email) whose script returns the status only if both match, mirroring the prototype's `trackOrder`.

## What not to do
* Don't compute prices or totals in the widget and submit them — the scripts ignore them anyway.
* Don't expose the admin in the storefront page; staff use the Creator-native reports.
* Don't call the checkout "secure payment" until a gateway is configured and tested.
