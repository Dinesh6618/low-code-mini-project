# Product photographs

The storefront shows photographs only. A product with no photograph (or whose photograph fails to load) shows a neutral **"photograph coming soon"** placeholder — never an illustration.

The files here are **sample images** (free-to-use Pexels stock, see [`CREDITS.md`](CREDITS.md)) of similar garments. They are labelled "Sample photograph" in the shop and **do not show BoutiqueFlow's actual items**. Replace them with your own photography before you sell anything.

## Which photos you may use
Only images you have the right to publish:
* your own photoshoot or your brand/manufacturer's photography (with permission to use it),
* licensed or free-to-use stock (check the licence and any model-release terms).

**Do not copy photographs from other shops or from search results** (Amazon, Libas, Google Images and so on). They belong to those retailers and their models; publishing them is copyright infringement.

## Folder layout
One folder per product, named exactly like the product's slug (list below):

```
assets/products/
  soiree-satin-midi-dress/
    1.jpg  2.jpg  3.jpg        shared shots: every colour (front, back, fabric close-up, border detail…)
    burgundy__1.jpg            shots of the Burgundy colour only
    midnight__1.jpg
  anaya-chikankari-kurti/
    dusty-rose__1.jpg ...
assets/hero/
  1.jpg  2.jpg                 home-page hero (up to three, shown side by side)
```

* The **first** image is the product's main image (catalogue, bag, product page). Order is numeric: `1`, `2`, `10`.
* `<colour>__1.jpg` shows first when that colour is selected; colour names are lower-case with `-` for spaces (`dusty-rose`, `powder-blue`). If a product has photos only for other colours, the page shows them and says which colour was photographed.
* `.jpg .jpeg .png .webp .avif` are accepted. Avoid spaces in file names.
* Portrait photos at about 4:5 (for example 1200 × 1500 px) crop best. Photos are cropped to the tile with the top kept in view, so faces stay visible.
* Keep each file under roughly 400 KB.

## Wire them in
From the `prototype` folder:

```
node tools/build-photo-manifest.js
```

It scans the folders, writes `assets/products/manifest.js`, lists the products that still have no photograph, and warns about unmatched colours or misspelt folders. Then use **Admin → Settings → Reset demo data** (or clear this site's data) so the product records pick up the new images.

You can also attach photographs without touching files: **Admin → Products → Edit → Photographs** supports *Upload main image*, *Add gallery images*, *Add link* (https only), *Make main* and a per-photo colour tag. Those are stored in the product record and take priority.

## Product slugs
`mahika-kanchipuram-silk-saree` · `banarasi-georgette-saree` · `chanderi-cotton-silk-saree` · `tussar-handloom-saree` · `anaya-chikankari-kurti` · `block-print-cotton-kurti` · `silk-blend-straight-kurti` · `linen-mandarin-collar-kurti` · `soiree-satin-midi-dress` · `crepe-wrap-dress` · `floral-voile-maxi-dress` · `pleated-shirt-dress` · `silk-charmeuse-camisole` · `ruffle-collar-blouse` · `linen-boxy-shirt` · `embroidered-peplum-top` · `hand-painted-silk-scarf` · `structured-leather-tote` · `gold-plated-jhumka-earrings` · `embroidered-potli-clutch`
