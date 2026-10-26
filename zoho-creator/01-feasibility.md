# 01 · Feasibility check against Zoho Creator

The brief asks to **verify that the storefront, bag and checkout can be built with the selected Zoho Creator plan** and to name any dependency on a custom page, API or external integration.

> **What I could and could not check.** I had no access to a Zoho Creator account or to your plan, so nothing here was confirmed against your tenant. The table separates what Creator does natively from what depends on your edition. **Before you commit to a design, spend 15 minutes confirming each "Verify" row in Creator's pricing/feature page and in a trial of your edition.** Edition names and limits change; I have deliberately not quoted plan names or numbers I cannot confirm.

## Summary

| Capability needed | Approach | Status |
|---|---|---|
| Forms, lookups, validation, subforms, auto-number | Native Creator forms | **Native** |
| Reports, filters, summary/pivot reports, CSV export | Native reports | **Native** |
| Business logic (totals, stock checks, order numbers, stock deduct/restore) | Deluge form workflows + functions (`../deluge/`) | **Native** |
| Notifications | In-app rows + Deluge `sendmail` | **Native** — email volume limits depend on edition → *Verify* |
| Scheduled jobs (expire unpaid orders, low-stock digest) | Deluge schedules | **Native** — *Verify* the number/frequency of schedules your edition allows |
| Roles and permissions | Profiles + per-form/report/field permissions + `Staff_Members` checks in Deluge | **Native** |
| Admin dashboard | Creator **Page** built from KPI/chart components over the reports | **Native** |
| Customer sign-in, "see only my orders" | Creator **Portal** (external users) or a public page + guest tracking | *Verify*: portal availability and the **number of portal users** your edition includes |
| Premium storefront look (hero, grid, filters, gallery, drawer) | A **custom Page with an HTML/CSS/JS Widget** using the Creator JS API | **Custom page/widget dependency** — see `05-storefront-pages.md` |
| Guest browsing without login | Publish the catalogue page/report with a **public permalink**; checkout via a public form or a Custom API | *Verify* permalink + public-form limits; **Custom API dependency** if checkout must run from a public widget |
| Dev / Stage / Production | Creator **Environments** | *Verify* — typically a higher edition |
| Real payment gateway | Creator's payment-form integration, or a gateway called from Deluge (`invokeUrl`) with a webhook handled by a Custom API | **External dependency — not built.** The package ships a clearly labelled *simulated* payment only |
| Real email/SMS delivery | `sendmail` (email); SMS/WhatsApp via an integration | Email: *Verify* after configuring sender. SMS: **not included** |
| Product photographs | Image / file-upload fields | **Native** |

## Decision: two tiers, so you always have a working app

1. **Tier A — built from native components only (always possible).**
   Catalogue as a card/list report, "Add to bag" as the `Cart_Items` form, checkout as the `Orders` form with an `Order_Items` subform, tracking as the `My_Orders` report. Every rule (stock, totals, order number, deduction, cancellation, permissions) lives in Deluge, so Tier A is fully functional. It looks like a Creator app rather than a boutique.

2. **Tier B — premium storefront (needs a custom Page + Widget).**
   A Creator Page hosts a JavaScript widget that reproduces the prototype's look and talks to the **same forms and the same Deluge rules** through the Creator JS API. No business rule moves into the browser, so Tier A and Tier B enforce identical logic. The adapter in `widget/boutiqueflow-adapter.js` shows the call mapping.

   *Dependencies Tier B introduces:* a Page with the HTML/JS widget, Creator JS API access for the signed-in user, and — if anonymous visitors must be able to check out — a **Custom API** (or a public form) because anonymous visitors have no API session. If your edition has neither, run Tier B for signed-in customers only and keep guest checkout on the Tier A public form.

## Things deliberately not claimed

* No real payment is taken, anywhere. "Online (simulated)" exists to demonstrate the order-state flow (stock is deducted only once payment is marked *Paid*).
* Emails are not confirmed delivered until you configure a sender and test it (see `06-testing-and-deployment.md`).
* The Deluge in `../deluge/` has **not been executed** in Creator. It is written to Deluge syntax and must be tested in Development.
