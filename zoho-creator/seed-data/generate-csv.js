/* Generates the Zoho Creator import files from the prototype's demo catalogue.
   Usage (from this folder):  node generate-csv.js
   Import order matters because of lookups: Categories, Colours, Products, Product_Variants. */
'use strict';
const fs = require('fs');
const path = require('path');

require('../../prototype/js/seed.js');
const S = globalThis.BFSeed;

const q = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = (rows) => '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
const write = (name, rows) => { fs.writeFileSync(path.join(__dirname, name + '.csv'), csv(rows)); console.log(name + '.csv', rows.length - 1, 'rows'); };

write('Categories', [['Category_Name', 'Tagline', 'Display_Order', 'Active']].concat(S.CATEGORIES.map((c, i) => [c.name, c.tagline, i + 1, 'true'])));

write('Colours', [['Colour_Name', 'Hex_Code']].concat(Object.keys(S.COLORS).map((n) => [n, S.COLORS[n]])));

const catName = (slug) => S.CATEGORIES.find((c) => c.slug === slug).name;
write('Products', [['Product_Name', 'Slug', 'Category', 'Description', 'Fabric', 'Care_Instructions', 'Price', 'Sale_Price', 'Active', 'Featured', 'Popularity_Base']].concat(
  S.PRODUCTS.map((p) => [p.name, p.slug, catName(p.cat), p.desc, p.fabric, S.CARE[p.care].join('\n'), p.price, p.sale || '', 'true', p.featured ? 'true' : 'false', p.pop])));

const prefix = { sarees: 'SAR', kurtis: 'KUR', dresses: 'DRS', lehengas: 'LEH', 'ethnic-sets': 'ESE', tops: 'TOP', accessories: 'ACC' };
const count = {};
const variants = [['Product', 'Colour', 'Size', 'SKU', 'Stock_Qty', 'Active', 'Low_Stock_Alerted']];
S.PRODUCTS.forEach((p) => {
  count[p.cat] = (count[p.cat] || 0) + 1;
  const base = prefix[p.cat] + String(count[p.cat]).padStart(2, '0');
  p.colors.forEach((c) => p.sizes.forEach((size) => {
    const code = c.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    const sz = size === 'One Size' ? 'OS' : size === 'Free Size' ? 'FS' : size.toUpperCase();
    variants.push([p.name, c, size, base + '-' + code + '-' + sz, 10, 'true', 'false']);
  }));
});
write('Product_Variants', variants);

write('Promo_Codes', [['Code', 'Discount_Type', 'Discount_Value', 'Min_Order', 'Max_Discount', 'Active']].concat(
  S.PROMOS.map((p) => [p.code, p.type === 'percent' ? 'Percent' : 'Flat', p.value, p.min, p.cap || '', 'true'])));

write('Store_Settings', [['Low_Stock_Threshold', 'Delivery_Fee', 'Free_Delivery_Over', 'ETA_Min_Days', 'ETA_Max_Days', 'Unpaid_Order_Timeout_Minutes'], [5, 150, 3000, 3, 6, 30]]);

write('Staff_Members', [['Staff_Name', 'Email', 'Role', 'Can_Manage_Products', 'Can_Fulfil_Orders', 'Active'],
  ['Replace with your admin', 'admin@your-domain.example', 'Admin', 'true', 'true', 'true'],
  ['Replace with product staff', 'products@your-domain.example', 'Staff', 'true', 'false', 'true'],
  ['Replace with fulfilment staff', 'fulfilment@your-domain.example', 'Staff', 'false', 'true', 'true']]);
