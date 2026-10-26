/* BoutiqueFlow — Creator JS API adapter (Tier B storefront)  — STARTER, NOT TESTED.

   The prototype UI in ../../prototype talks to `BF.api`. In Creator, the same UI can run inside a
   Page widget by replacing that object with calls to the Creator JS API. Business rules are NOT
   duplicated: totals, stock checks, order numbers, stock deduction and cancellation all execute in
   the Deluge workflows (../deluge/). The widget only reads data and submits forms.

   Load in the widget page:
     <script src="https://js.zohostatic.com/creator/widgets/version/2.0/widgetsdk-min.js"></script>
   Confirm the SDK URL and method names against Zoho's current Widget documentation before use.
*/
(function () {
  'use strict';
  const APP = 'boutiqueflow';            // app link name — check yours (Settings → Application)
  const R = { products: 'Product_Catalogue', myOrders: 'My_Orders', orders: 'Orders_Admin', inventory: 'Inventory' };
  const ok = (res) => { if (res.code !== 3000) throw new Error((res.message || 'Request failed') + ' (' + res.code + ')'); return res; };
  const C = () => window.ZOHO.CREATOR;

  const api = {
    init: () => C().init(),

    /* catalogue: read-only report */
    products: (criteria) => C().API.getAllRecords({ appName: APP, reportName: R.products, criteria: criteria || '(Active == true)', page: 1, pageSize: 200 }).then(ok).then((r) => r.data),

    /* variants of one product (stock per colour/size) */
    variants: (productId) => C().API.getAllRecords({ appName: APP, reportName: 'Inventory', criteria: '(Product == ' + productId + ' && Active == true)', page: 1, pageSize: 200 }).then(ok).then((r) => r.data),

    /* checkout: ONE form submission. Prices and totals sent from here are ignored — the
       Orders > On Validate script recomputes everything and rejects on any stock problem. */
    placeOrder: ({ contact, address, method, promoCode, lines }) => C().API.addRecord({
      appName: APP, formName: 'Orders',
      data: { data: {
        Customer_Name: contact.name, Email: contact.email, Phone: contact.phone,
        Ship_Line1: address.line1, Ship_Line2: address.line2, Ship_City: address.city, Ship_State: address.state, Ship_PIN: address.pincode,
        Payment_Method: method === 'COD' ? 'Cash on Delivery' : 'Online (simulated)', Promo_Code: promoCode || '',
        Order_Items: lines.map((l) => ({ Product_Variant: l.variantId, Quantity: l.qty }))
      } }
    }).then(ok),   // validation alerts from Deluge come back as an error message — show them to the shopper

    /* simulated online payment: marks the Payments row Paid; the Payments workflow confirms the order */
    completeSimulatedPayment: (paymentId) => C().API.updateRecord({ appName: APP, reportName: 'Payments_Admin', id: paymentId, data: { data: { Payment_Status: 'Paid' } } }).then(ok),

    /* customer: own orders only — the report's record criteria (Email == zoho.loginuserid) enforces it server-side */
    myOrders: () => C().API.getAllRecords({ appName: APP, reportName: R.myOrders, page: 1, pageSize: 100 }).then(ok).then((r) => r.data),

    /* cancellation is a request the server decides on (eligibility + ownership checked in Deluge) */
    requestCancellation: (orderId, reason) => C().API.addRecord({ appName: APP, formName: 'Cancellation_Requests', data: { data: { Order: orderId, Reason: reason } } }).then(ok)
  };

  window.BFCreatorAdapter = api;
})();
