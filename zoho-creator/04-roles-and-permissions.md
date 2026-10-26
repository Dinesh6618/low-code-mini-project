# 04 · Roles and permissions

Access control must be enforced by Creator itself, not by hiding buttons. Two layers work together:

1. **Creator profiles** decide which forms, reports, pages and fields a user can open or change.
2. **Deluge checks** (`bf.hasPermission`, ownership tests with `zoho.loginuserid`) re-check inside every script, so a request that slips past the UI is still refused.

Create three profiles (Settings → Users & Control → Profiles / Permissions) and assign each user one of them.

## Role matrix

| Area | Customer | Staff | Admin |
|---|---|---|---|
| Product_Catalogue (browse) | view | view | view |
| Products, Product_Variants, Colours, Categories | — | add/edit **if** `Can_Manage_Products` | full |
| Stock_Adjustments (change stock) | — | add **if** `Can_Manage_Products` | add |
| Inventory_Movements | — | view | view |
| Carts, Cart_Items | own only | — | view |
| Orders — create (checkout) | add | — | add |
| Orders — read | **own only** (`Email == zoho.loginuserid`) | all, **if** `Can_Fulfil_Orders` | all |
| Orders — edit fields | **never** (fields are RO) | **never** directly | **never** directly |
| Order status changes | via `Cancellation_Requests` only | via report actions / `Ship_Order` **if** `Can_Fulfil_Orders` | same |
| Payments | — | view | view / mark paid |
| Customers, Addresses | own record only | read (contact + delivery data needed to ship) | full |
| Customer lifetime value / sales reports | — | — | view |
| Staff_Members, Promo_Codes, Store_Settings | — | — | full |
| Reports & analytics pages | — | operational reports only | all |
| Notifications | own (`Customer_Email == zoho.loginuserid`) | Staff audience | all |

## How to set it up in Creator

**Customer profile**
* Forms: allow *Add* on `Orders`, `Cancellation_Requests`, `Carts`, `Cart_Items`, `Addresses`, `Customers` (own record). No access to every other form.
* Reports: `Product_Catalogue` (all active products); `My_Orders`, `My_Notifications` with **record-level criteria** `Email == zoho.loginuserid` / `Customer_Email == zoho.loginuserid`; for `Addresses`, `Carts` use "records added by the user".
* Fields: on `Orders`, mark every system field *read-only*; hide the cost-like and internal flags (`Stock_Deducted`, `Stock_Restored`, `Last_Notified_Status`).

**Staff profile**
* Reports: `Orders_Admin`, `Customers_Admin` (view only), `Inventory`, `Low_Stock`, `Stock_Movements`, `Staff_Notifications`; `Products_Admin` for those with product rights.
* Forms: `Ship_Order`, `Stock_Adjustments`, `Products`, `Product_Variants` (without `Stock_Qty`).
* **Do not** grant access to `Staff_Members`, `Store_Settings`, `Promo_Codes`, sales summaries.
* Fine-grained split (products vs fulfilment) is enforced in Deluge via `Staff_Members.Can_Manage_Products` / `Can_Fulfil_Orders`, because Creator profiles are coarser. Create one profile per combination if you prefer to enforce it in the profile as well.

**Admin profile**
* Creator's built-in Administrator, or a custom profile with everything enabled, assigned only to the owner(s).

## Ownership rules implemented in Deluge

| Rule | Where |
|---|---|
| A customer can only place an order as themselves (Customer and Email overwritten from the login) | `Orders > On Validate` |
| A customer can only request cancellation of an order whose `Email` equals their login | `Cancellation_Requests > On Validate` |
| Only fulfilment staff can ship, pack, deliver or cancel on behalf of the shop | `bf.hasPermission` in `Ship_Order`, report actions |
| Only product staff can change stock or products | `Stock_Adjustments`, `Products`, `Product_Variants` validate |
| Status can only move forward one step | `bf.advanceStatus` |
| An admin cannot be locked out by the last admin deactivating themselves | add a validate on `Staff_Members` (keep ≥ 1 active admin) |

## Verify after setup (also in `06-testing-and-deployment.md`)

Open Creator's **"Preview as user"** (or log in as test users) for each profile and confirm: a customer cannot open another customer's order URL; staff without fulfilment rights cannot open `Orders_Admin`; no profile can edit `Stock_Qty` directly.
