# 02 · Data model

Forms (tables) to create in Zoho Creator. **Link names matter**: the Deluge scripts use them verbatim. Creator builds a link name from the field label by replacing spaces with underscores (`Order Status` → `Order_Status`). If you rename a field, update the scripts.

`Added_User`, `Added_Time` and `ID` exist on every form automatically.

Legend — **Req** required · **Uniq** unique · **RO** read-only to every profile (changed only by scripts) · **Hid** hidden on the form.

## Relationships

```
Categories 1─* Products 1─* Product_Variants *─1 Colours
                                  │
        ┌─────────────────────────┼───────────────────────────┐
   Cart_Items *─1 Carts      Order_Items *─1 Orders      Inventory_Movements
        │                          │      │ 1─* Payments        ▲
   Customers 1─* Carts       Customers 1─* Orders        Stock_Adjustments (input form)
   Customers 1─* Addresses   Orders 1─* Cancellation_Requests
   Staff_Members, Promo_Codes, Store_Settings, Notifications (stand-alone)
```

## Catalogue

### Categories
Seed data has seven: Sarees, Kurtis, Dresses, **Lehengas**, **Ethnic Sets**, Tops, Accessories. The storefront navigation reads this form, so a category added here appears in the menu.

| Field | Type | Rules |
|---|---|---|
| Category_Name | Single line | Req, Uniq |
| Tagline | Single line | |
| Display_Order | Number | |
| Active | Checkbox | default on |

### Colours
| Field | Type | Rules |
|---|---|---|
| Colour_Name | Single line | Req, Uniq |
| Hex_Code | Single line | Req, pattern `^#[0-9A-Fa-f]{6}$` (used to paint swatches) |

### Products
| Field | Type | Rules |
|---|---|---|
| Product_Name | Single line | Req, Uniq |
| Slug | Single line | Uniq (URL-friendly name) |
| Category | **Lookup → Categories** | Req |
| Description | Multi line | |
| Fabric | Single line | |
| Care_Instructions | Multi line | one instruction per line |
| Price | Currency (INR) | Req, > 0 |
| Sale_Price | Currency (INR) | optional, must be < Price (script) |
| Primary_Image | Image | main product photograph (shown in the catalogue and bag) |
| Gallery_Images | Subform (Image, Sort_Order, Colour lookup → Colours (optional), Is_Sample checkbox) | extra photographs: front, back, fabric close-up, border detail. `Is_Sample` marks stand-in photos that do not show the actual item |
| Image_Note | Single line | optional disclosure shown under the photos, e.g. "Sample photograph" |
| Active | Checkbox | default on. **Deactivate instead of deleting** |
| Style, Length, Silhouette, Pattern, Material, Neckline, Sleeve_Type, Embellishment | Single line (or Dropdown with an "Other" option) | filter attributes behind the storefront's "Refine results"; optional per product |
| Features | Multi-select or Subform (Feature_Name) | e.g. With embroidery, For weddings, Handloom, Fully lined; a shopper ticking several expects *all* of them |
| Featured | Checkbox | "Festive Edit" |
| Popularity_Base | Number | seed for the popularity sort |

### Product_Variants — stock lives here, per colour and size
| Field | Type | Rules |
|---|---|---|
| Product | **Lookup → Products** | Req |
| Color | **Lookup → Colours** | Req |
| Size | Dropdown | XS, S, M, L, XL, XXL, One Size, Free Size · Req |
| SKU | Single line | Req, Uniq |
| Stock_Qty | Number | ≥ 0, **RO** (changed only by `bf.adjustStock`) |
| Low_Stock_Alerted | Checkbox | **Hid**, **RO** |
| Active | Checkbox | default on |
| Variant_Label | Formula | `Product.Product_Name + " – " + Color.Colour_Name + " / " + Size` |

Unique combination `Product + Color + Size` is enforced by the validate script.

## Customers and carts

### Customers (profile)
| Field | Type | Rules |
|---|---|---|
| Customer_Name | Single line | Req |
| Email | Email | Req, Uniq. **Must equal the user's Creator/portal login email**; scripts use `zoho.loginuserid` for ownership |
| Phone | Phone | 10-digit Indian mobile |

### Addresses
| Field | Type | Rules |
|---|---|---|
| Customer | **Lookup → Customers** | Req |
| Label | Single line | Home, Work… |
| Recipient_Name, Phone | Single line / Phone | Req |
| Line1 (Req), Line2, City (Req), State (Req) | Single line | |
| PIN_Code | Single line | Req, pattern `^[0-9]{6}$` |
| Is_Default | Checkbox | |

### Wishlist_Items
| Field | Type | Rules |
|---|---|---|
| Customer | Lookup → Customers | Req; visible only to that customer (record criteria `Customer.Email == zoho.loginuserid`) |
| Product | Lookup → Products | Req; unique with Customer (validate script), removed or hidden when the product is inactive |

Guests keep a wishlist in the browser; it is written to this form when they sign in.

### Carts / Cart_Items
| Form | Field | Type | Rules |
|---|---|---|---|
| Carts | Customer | Lookup → Customers | Req |
| | Promo_Code | Single line | |
| Cart_Items | Cart | Lookup → Carts | Req |
| | Product_Variant | Lookup → Product_Variants | Req |
| | Quantity | Number | ≥ 1; ≤ stock (validate script) |

Guests keep the bag in the browser until checkout; a signed-in customer's bag is saved in these forms.

## Orders

### Orders
| Field | Type | Rules |
|---|---|---|
| Order_Number | **Auto number** | prefix `BF-`, start `100001` — unique, gap-safe under concurrency, **RO** |
| Customer | Lookup → Customers | optional (guest checkout), set by script for signed-in users |
| Customer_Name | Single line | Req |
| Email | Email | Req |
| Phone | Phone | Req |
| Ship_Line1, Ship_Line2, Ship_City, Ship_State, Ship_PIN | Single line | PIN `^[0-9]{6}$`; address is **copied** so later edits never change an old order |
| Payment_Method | Radio | `Cash on Delivery`, `Online (simulated)` |
| Promo_Code | Single line | |
| Subtotal, Discount, Delivery_Fee, Total | Currency | **RO**, computed by the validate script |
| Order_Status | Dropdown | Pending Payment, Confirmed, Packed, Shipped, Delivered, Cancelled · **RO** |
| Payment_Status | Dropdown | Pending, Paid, Failed, Refund Pending, Refunded, Cancelled · **RO** |
| Stock_Deducted, Stock_Restored | Checkbox | **Hid**, **RO** — idempotency flags |
| Last_Notified_Status | Single line | **Hid**, **RO** — avoids duplicate notifications |
| Courier, Tracking_Number | Single line | **RO** (set via `Ship_Order`) |
| ETA_From, ETA_To | Date | **RO** |
| Cancel_Reason | Multi line | **RO** |
| Placed_On | Date-time | **RO** |
| Order_Items | **Subform → Order_Items** | at least one row |

### Order_Items (subform form)
| Field | Type | Notes |
|---|---|---|
| Order | Lookup → Orders | created by the subform |
| Product_Variant | Lookup → Product_Variants | Req |
| Quantity | Number | Req, ≥ 1 |
| Product_Name_Snapshot | Single line | **frozen at purchase** |
| Variant_Label_Snapshot | Single line | "Burgundy / M" |
| SKU_Snapshot | Single line | |
| Category_Snapshot | Single line | for category-wise sales |
| Unit_Price | Currency | **frozen at purchase** (sale price if one applied) |
| Line_Total | Formula | `Quantity * Unit_Price` |

Because name, variant and unit price are copied onto the line, **deactivating or repricing a product never alters history**.

### Payments
| Field | Type | Rules |
|---|---|---|
| Order | Lookup → Orders | Req |
| Order_Number | Single line | copy, for reports |
| Payment_Method | Single line | |
| Amount | Currency | |
| Payment_Status | Dropdown | Pending, Paid, Failed, Refund Pending, Refunded, Cancelled |
| Gateway_Reference | Single line | gateway id, or "COD cash collected" |
| Paid_On | Date-time | |

### Cancellation_Requests
| Field | Type | Rules |
|---|---|---|
| Order | Lookup → Orders | Req |
| Reason | Dropdown + text | Req |
| Request_Status | Dropdown | Pending, Approved, Declined · **RO** |
| Decision_Note | Multi line | **RO** |

### Ship_Order (tiny action form)
`Order` (lookup, Req) · `Courier` (dropdown) · `Tracking_Number` (Req).

## Inventory

### Inventory_Movements — the ledger (append-only)
| Field | Type |
|---|---|
| Product_Variant | Lookup → Product_Variants |
| Movement_Type | Dropdown: Opening Stock, Sale, Cancellation Restock, Restock, Adjustment, Damaged / Write-off |
| Quantity_Change | Number (signed) |
| Balance_After | Number |
| Order_Number | Single line (blank for manual changes) |
| Reason | Single line |
| Performed_By | Single line |

No profile may add, edit or delete these rows by hand; only `bf.adjustStock` writes them. **Invariant:** for every variant, the sum of `Quantity_Change` equals `Stock_Qty`.

### Stock_Adjustments (the only form staff use to change stock)
`Product_Variant` (lookup, Req) · `Action` (Add stock / Remove stock / Set exact count) · `Quantity` (Number ≥ 0) · `Reason_Type` (Restock / Adjustment / Damaged / Write-off) · `Note` · `Result` (RO, written by script).

## Supporting forms

| Form | Fields |
|---|---|
| **Notifications** | Audience (Staff / Customer), Customer_Email, Notification_Type, Title, Message, Order_Number, Channel (In-app / Email), Is_Read |
| **Promo_Codes** | Code (Uniq), Discount_Type (Percent / Flat), Discount_Value, Min_Order, Max_Discount, Active |
| **Store_Settings** | one record: Low_Stock_Threshold (5), Delivery_Fee (150), Free_Delivery_Over (3000), ETA_Min_Days (3), ETA_Max_Days (6), Unpaid_Order_Timeout_Minutes (30) |
| **Staff_Members** | Staff_Name, Email (Uniq), Role (Staff / Admin), Can_Manage_Products, Can_Fulfil_Orders, Active |

## Reports to create

| Report | On form | Criteria / grouping | Used for |
|---|---|---|---|
| Product_Catalogue | Products | `Active == true` | storefront (public) |
| Products_Admin | Products | all | product management |
| Inventory | Product_Variants | `Active == true`; highlight `Stock_Qty <= 5` | stock screen |
| Low_Stock | Product_Variants | `Active == true && Stock_Qty <= 5` | alerts + report |
| Stock_Movements | Inventory_Movements | newest first | history |
| Orders_Admin | Orders | all; custom actions Packed / Delivered / Cancel | fulfilment |
| My_Orders | Orders | `Email == zoho.loginuserid` | customer tracking |
| Payments_Admin | Payments | all (staff view; admin may mark *Paid*) | payment records |
| Pending_Payments | Orders | `Payment_Status == "Pending" && Order_Status != "Cancelled"` | report |
| Cancelled_Orders | Orders | `Order_Status == "Cancelled"` | report |
| Daily_Sales | Orders | Summary: group by day of `Placed_On`, Sum(`Total`), Count; `Order_Status != "Cancelled"` | daily sales |
| Monthly_Sales | Orders | Summary: group by month | monthly sales |
| Order_Volume | Orders | Summary: group by `Order_Status`, Count | fulfilment status |
| Best_Sellers | Order_Items | Summary: group by `Product_Name_Snapshot`, Sum(`Quantity`) | best-selling |
| Category_Sales | Order_Items | Summary: group by `Category_Snapshot`, Sum(`Line_Total`) | category-wise sales |
| Customers_Admin | Customers | all | customer management |
| My_Notifications / Staff_Notifications | Notifications | by audience / email | notification centre |

> Exclude cancelled orders from the sales summaries by filtering on `Order_Status`, and for the Order_Items summaries add `Order.Order_Status != "Cancelled"`.
