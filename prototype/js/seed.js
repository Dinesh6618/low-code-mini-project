/* BoutiqueFlow — static demo catalogue.
   Mirrors the seed data that the Zoho Creator package imports (see zoho-creator/seed-data). */
(function (root) {
  'use strict';

  const COLORS = {
    'Burgundy': '#672C3A',
    'Emerald': '#1F4D43',
    'Champagne': '#CDB68C',
    'Ivory': '#EFE6D8',
    'Dusty Rose': '#C99A9F',
    'Sage': '#9CAA93',
    'Powder Blue': '#B8C5D3',
    'Blush': '#E5C9C0',
    'Terracotta': '#B5694B',
    'Olive': '#6F6B47',
    'Midnight': '#26324A',
    'Plum': '#4B2A4A',
    'Charcoal': '#3B3A3C',
    'Espresso': '#3A2E28',
    'Antique Gold': '#B49A72',
    'Rose Gold': '#C9967F',
    'Crimson': '#9B1B30',
    'Rose Pink': '#C9788E',
    'Marigold': '#D9A21B',
    'Indigo': '#3F5E8C'
  };

  const CATEGORIES = [
    { slug: 'sarees', name: 'Sarees', tagline: 'Woven heirlooms' },
    { slug: 'kurtis', name: 'Kurtis', tagline: 'Everyday elegance' },
    { slug: 'dresses', name: 'Dresses', tagline: 'Considered silhouettes' },
    { slug: 'lehengas', name: 'Lehengas', tagline: 'For the wedding season' },
    { slug: 'ethnic-sets', name: 'Ethnic Sets', tagline: 'Matching kurta sets' },
    { slug: 'tops', name: 'Tops', tagline: 'Refined separates' },
    { slug: 'accessories', name: 'Accessories', tagline: 'The finishing touch' }
  ];

  const CARE = {
    silk: ['Dry clean only.', 'Store folded in muslin, away from direct sunlight.', 'Iron on low heat on the reverse side.'],
    cotton: ['Gentle machine wash, cold, with like colours.', 'Dry in shade to preserve colour.', 'Medium iron on the reverse side.'],
    linen: ['Hand wash cold or gentle machine cycle.', 'Do not tumble dry; line dry in shade.', 'Iron while slightly damp for a crisp finish.'],
    delicate: ['Dry clean recommended.', 'If hand washing, use a mild detergent in cool water.', 'Do not wring; press between towels.'],
    leather: ['Wipe with a soft, dry cloth.', 'Keep away from water and prolonged sunlight.', 'Store in the dust bag provided.'],
    jewellery: ['Keep dry and avoid perfume contact.', 'Store in the pouch provided.', 'Polish gently with a soft cloth.'],
    embroidered: ['Dry clean only.', 'Store flat or rolled in muslin; do not fold along the embroidery.', 'Keep away from perfume and direct sunlight.']
  };

  const SIZES = {
    garment: ['XS', 'S', 'M', 'L', 'XL'],
    kurti: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    one: ['One Size'],
    free: ['Free Size']
  };

  // ageDays: how long ago the product was introduced (drives "newest").
  const PRODUCTS = [
    // Sarees
    { slug: 'mahika-kanchipuram-silk-saree', name: 'Mahika Kanchipuram Silk Saree', cat: 'sarees', shape: 'saree', pattern: 'zari', price: 18500, sale: null,
      colors: ['Burgundy', 'Emerald', 'Champagne'], sizes: SIZES.free, fabric: 'Pure mulberry silk', care: 'silk', ageDays: 6, pop: 48, featured: true,
      desc: 'Handwoven in Kanchipuram with a lustrous zari border and a richly detailed pallu. A piece made to be passed on.' },
    { slug: 'banarasi-georgette-saree', name: 'Banarasi Georgette Saree', cat: 'sarees', shape: 'saree', pattern: 'floral', price: 12800, sale: 10900,
      colors: ['Ivory', 'Dusty Rose'], sizes: SIZES.free, fabric: 'Georgette with woven brocade', care: 'silk', ageDays: 20, pop: 36, featured: true,
      desc: 'Featherlight georgette with a delicate Banarasi brocade motif. Falls beautifully, travels easily.' },
    { slug: 'chanderi-cotton-silk-saree', name: 'Chanderi Cotton-Silk Saree', cat: 'sarees', shape: 'saree', pattern: 'stripe', price: 6400, sale: null,
      colors: ['Sage', 'Powder Blue', 'Blush'], sizes: SIZES.free, fabric: 'Chanderi cotton-silk', care: 'delicate', ageDays: 41, pop: 29, featured: false,
      desc: 'A sheer, airy weave with fine tonal stripes and a softly glowing finish. Quietly festive.' },
    { slug: 'tussar-handloom-saree', name: 'Tussar Handloom Saree', cat: 'sarees', shape: 'saree', pattern: 'block', price: 8900, sale: null,
      colors: ['Terracotta', 'Olive'], sizes: SIZES.free, fabric: 'Tussar silk, block printed', care: 'silk', ageDays: 63, pop: 22, featured: false,
      desc: 'Naturally textured tussar silk, hand block printed in earthy tones with a contrast border.' },

    // Kurtis
    { slug: 'anaya-chikankari-kurti', name: 'Anaya Chikankari Kurti', cat: 'kurtis', shape: 'kurti', pattern: 'floral', price: 3900, sale: null,
      colors: ['Ivory', 'Blush', 'Powder Blue'], sizes: SIZES.kurti, fabric: 'Cotton mulmul, hand embroidered', care: 'cotton', ageDays: 3, pop: 54, featured: true,
      desc: 'Lucknowi chikankari worked by hand across the yoke and placket. Soft, breathable, effortlessly refined.' },
    { slug: 'block-print-cotton-kurti', name: 'Block-Print Cotton Kurti', cat: 'kurtis', shape: 'kurti', pattern: 'block', price: 2600, sale: 2100,
      colors: ['Terracotta', 'Midnight'], sizes: SIZES.kurti, fabric: 'Hand block-printed cotton', care: 'cotton', ageDays: 28, pop: 61, featured: false,
      desc: 'Hand block printed in Jaipur with natural-dye tones. A relaxed straight cut for every day.' },
    { slug: 'silk-blend-straight-kurti', name: 'Silk-Blend Straight Kurti', cat: 'kurtis', shape: 'kurti', pattern: 'zari', price: 4800, sale: null,
      colors: ['Burgundy', 'Emerald'], sizes: SIZES.kurti, fabric: 'Silk-cotton blend with zari trim', care: 'delicate', ageDays: 12, pop: 33, featured: true,
      desc: 'A structured straight kurti with fine zari at the neckline and cuffs. Ready for dinner or the festive season.' },
    { slug: 'linen-mandarin-collar-kurti', name: 'Linen Mandarin-Collar Kurti', cat: 'kurtis', shape: 'kurti', pattern: 'plain', price: 3200, sale: null,
      colors: ['Sage', 'Ivory', 'Charcoal'], sizes: SIZES.kurti, fabric: 'Washed European linen', care: 'linen', ageDays: 55, pop: 27, featured: false,
      desc: 'Washed linen with a clean mandarin collar and side slits. Understated and endlessly wearable.' },

    // Dresses
    { slug: 'soiree-satin-midi-dress', name: 'Soirée Satin Midi Dress', cat: 'dresses', shape: 'dress', pattern: 'plain', price: 7200, sale: null,
      colors: ['Burgundy', 'Midnight', 'Champagne'], sizes: SIZES.garment, fabric: 'Heavy satin, fully lined', care: 'delicate', ageDays: 9, pop: 58, featured: true,
      desc: 'A bias-skimming satin midi with slim straps and a fluid skirt. Evening, simplified.' },
    { slug: 'crepe-wrap-dress', name: 'Wrap Dress in Crepe', cat: 'dresses', shape: 'dress', pattern: 'plain', price: 5600, sale: 4500,
      colors: ['Olive', 'Plum'], sizes: SIZES.garment, fabric: 'Matte crepe', care: 'delicate', ageDays: 33, pop: 44, featured: false,
      desc: 'A true wrap that flatters every figure, cut from a matte crepe with a graceful drape.' },
    { slug: 'floral-voile-maxi-dress', name: 'Floral Voile Maxi Dress', cat: 'dresses', shape: 'dress', pattern: 'floral', price: 6100, sale: null,
      colors: ['Blush', 'Sage'], sizes: SIZES.garment, fabric: 'Cotton voile, lined', care: 'cotton', ageDays: 48, pop: 31, featured: false,
      desc: 'A softly printed voile maxi with a gathered skirt and adjustable straps. Made for long afternoons.' },
    { slug: 'pleated-shirt-dress', name: 'Pleated Shirt Dress', cat: 'dresses', shape: 'dress', pattern: 'stripe', price: 5900, sale: null,
      colors: ['Ivory', 'Charcoal'], sizes: SIZES.garment, fabric: 'Cotton-poplin blend', care: 'cotton', ageDays: 71, pop: 18, featured: false,
      desc: 'A tailored shirt dress with knife pleats and a self belt. Polished from morning to evening.' },

    // Tops
    { slug: 'silk-charmeuse-camisole', name: 'Silk Charmeuse Camisole', cat: 'tops', shape: 'top', pattern: 'plain', price: 3400, sale: null,
      colors: ['Champagne', 'Burgundy', 'Ivory'], sizes: SIZES.garment, fabric: 'Silk charmeuse', care: 'silk', ageDays: 5, pop: 40, featured: false,
      desc: 'A liquid-soft silk camisole with a gently scooped neck. Wear it alone or layered.' },
    { slug: 'ruffle-collar-blouse', name: 'Ruffle Collar Blouse', cat: 'tops', shape: 'top', pattern: 'plain', price: 3800, sale: null,
      colors: ['Ivory', 'Blush'], sizes: SIZES.garment, fabric: 'Cotton-silk blend', care: 'delicate', ageDays: 17, pop: 25, featured: false,
      desc: 'A romantic ruffled collar on a crisp, fluid blouse. Pairs with tailoring or a simple skirt.' },
    { slug: 'linen-boxy-shirt', name: 'Linen Boxy Shirt', cat: 'tops', shape: 'top', pattern: 'stripe', price: 2900, sale: 2400,
      colors: ['Sage', 'Powder Blue'], sizes: SIZES.garment, fabric: 'Yarn-dyed linen', care: 'linen', ageDays: 38, pop: 35, featured: false,
      desc: 'A relaxed boxy shirt in fine yarn-dyed stripes. Gets softer with every wash.' },
    { slug: 'embroidered-peplum-top', name: 'Embroidered Peplum Top', cat: 'tops', shape: 'top', pattern: 'zari', price: 4200, sale: null,
      colors: ['Midnight', 'Terracotta'], sizes: SIZES.garment, fabric: 'Dupion silk with zari thread work', care: 'silk', ageDays: 14, pop: 21, featured: true,
      desc: 'Fine zari embroidery along the hem and cuffs of a structured dupion top.' },

    // Accessories
    { slug: 'hand-painted-silk-scarf', name: 'Hand-Painted Silk Scarf', cat: 'accessories', shape: 'scarf', pattern: 'floral', price: 2800, sale: null,
      colors: ['Burgundy', 'Champagne', 'Powder Blue'], sizes: SIZES.one, fabric: 'Pure silk twill', care: 'silk', ageDays: 8, pop: 37, featured: true,
      desc: 'Hand-painted silk twill with rolled edges. Knot it at the neck, on a bag, or in the hair.' },
    { slug: 'structured-leather-tote', name: 'Structured Leather Tote', cat: 'accessories', shape: 'tote', pattern: 'plain', price: 11500, sale: null,
      colors: ['Espresso', 'Burgundy', 'Ivory'], sizes: SIZES.one, fabric: 'Full-grain leather, suede lining', care: 'leather', ageDays: 24, pop: 30, featured: false,
      desc: 'A roomy, structured tote in full-grain leather with brushed gold hardware and a suede-lined interior.' },
    { slug: 'gold-plated-jhumka-earrings', name: 'Gold-Plated Jhumka Earrings', cat: 'accessories', shape: 'jhumka', pattern: 'plain', price: 3600, sale: null,
      colors: ['Antique Gold', 'Rose Gold'], sizes: SIZES.one, fabric: 'Gold-plated brass with pearl drops', care: 'jewellery', ageDays: 11, pop: 46, featured: true,
      desc: 'Traditional jhumka domes finished in antique gold with freshwater pearl drops.' },
    { slug: 'embroidered-potli-clutch', name: 'Embroidered Potli Clutch', cat: 'accessories', shape: 'clutch', pattern: 'zari', price: 4400, sale: 3700,
      colors: ['Burgundy', 'Champagne'], sizes: SIZES.one, fabric: 'Raw silk with zari embroidery', care: 'silk', ageDays: 52, pop: 19, featured: false,
      desc: 'A compact clutch in raw silk with zari embroidery and a gold clasp. Holds the evening essentials.' },

    // Lehengas
    { slug: 'zardozi-bridal-lehenga', name: 'Zardozi Bridal Lehenga', cat: 'lehengas', price: 62000, sale: null,
      colors: ['Crimson'], sizes: SIZES.garment, fabric: 'Raw silk and velvet with zardozi hand embroidery', care: 'embroidered', ageDays: 10, pop: 26, featured: true,
      desc: 'A full-flare bridal lehenga with dense zardozi work across the skirt and border, finished with a matching net veil. Made to order in your measurements.' },
    { slug: 'rose-embroidered-lehenga-set', name: 'Rose Embroidered Lehenga Set', cat: 'lehengas', price: 38500, sale: 34900,
      colors: ['Rose Pink', 'Burgundy'], sizes: SIZES.garment, fabric: 'Silk with sequin and thread embroidery', care: 'embroidered', ageDays: 15, pop: 24, featured: true,
      desc: 'A three-piece lehenga set with tonal sequin embroidery, a fitted choli and a sheer embroidered dupatta. Soft in colour, rich in detail.' },
    { slug: 'marigold-mehendi-lehenga', name: 'Marigold Mehendi Lehenga', cat: 'lehengas', price: 24500, sale: null,
      colors: ['Marigold'], sizes: SIZES.garment, fabric: 'Silk-cotton with printed florals and gota trim', care: 'embroidered', ageDays: 22, pop: 20, featured: false,
      desc: 'A lighter lehenga for daytime ceremonies: printed florals, gota trim and a comfortable, easy flare.' },

    // Ethnic sets
    { slug: 'block-print-anarkali-set', name: 'Block-Print Anarkali Set', cat: 'ethnic-sets', price: 7800, sale: null,
      colors: ['Ivory'], sizes: SIZES.garment, fabric: 'Cotton mulmul with a block-printed dupatta', care: 'cotton', ageDays: 4, pop: 31, featured: false,
      desc: 'A flowing anarkali with a hand block-printed dupatta in a coordinating print. Light enough for long days.' },
    { slug: 'indigo-embroidered-kurta-set', name: 'Embroidered Kurta, Palazzo & Dupatta Set', cat: 'ethnic-sets', price: 9400, sale: 8200,
      colors: ['Indigo'], sizes: SIZES.garment, fabric: 'Chanderi blend with thread embroidery', care: 'delicate', ageDays: 7, pop: 28, featured: true,
      desc: 'A three-piece set: embroidered kurta, straight palazzo and a sheer dupatta. Dressed up or down.' }
  ];

  const CUSTOMERS = [
    { name: 'Priya Raman', email: 'customer@boutiqueflow.demo', phone: '9840012345', city: 'Chennai', state: 'Tamil Nadu', pin: '600028', line1: '14, Eldams Road, Teynampet' },
    { name: 'Ishita Verma', email: 'ishita.verma@example.com', phone: '9811122334', city: 'New Delhi', state: 'Delhi', pin: '110017', line1: '22, Hauz Khas Village' },
    { name: 'Neha Kapoor', email: 'neha.kapoor@example.com', phone: '9822233445', city: 'Mumbai', state: 'Maharashtra', pin: '400050', line1: '9, Hill Road, Bandra West' },
    { name: 'Sana Qureshi', email: 'sana.qureshi@example.com', phone: '9848811223', city: 'Hyderabad', state: 'Telangana', pin: '500034', line1: '31, Road No. 12, Banjara Hills' },
    { name: 'Lakshmi Narayanan', email: 'lakshmi.n@example.com', phone: '9880099887', city: 'Bengaluru', state: 'Karnataka', pin: '560038', line1: '7, 12th Main, Indiranagar' },
    { name: 'Rhea Dsouza', email: 'rhea.dsouza@example.com', phone: '9847700112', city: 'Kochi', state: 'Kerala', pin: '682016', line1: '18, Marine Drive' },
    { name: 'Meenakshi Subramanian', email: 'meenakshi.s@example.com', phone: '9790055667', city: 'Madurai', state: 'Tamil Nadu', pin: '625002', line1: '5, West Masi Street' }
  ];

  const PROMOS = [
    { code: 'WELCOME10', type: 'percent', value: 10, min: 0, cap: 1500, active: true, note: '10% off your order, up to ₹1,500' },
    { code: 'FESTIVE500', type: 'flat', value: 500, min: 5000, cap: 0, active: true, note: '₹500 off orders above ₹5,000' }
  ];

  /* Filterable attributes per product (the "Refine results" groups). Free text, so the admin can add new values.
     length / silhouette / neckline / sleeve are left empty where they do not apply (sarees, accessories). */
  const ATTRS = {
    'mahika-kanchipuram-silk-saree': { style: 'Wedding', pattern: 'Zari woven', material: 'Silk', embellishment: 'Zari', features: ['For weddings', 'Handloom'] },
    'banarasi-georgette-saree': { style: 'Festive', pattern: 'Floral', material: 'Georgette', embellishment: 'Zari', features: ['For weddings', 'Handloom'] },
    'chanderi-cotton-silk-saree': { style: 'Festive', pattern: 'Striped', material: 'Cotton silk', embellishment: '', features: ['Handloom'] },
    'tussar-handloom-saree': { style: 'Casual', pattern: 'Block print', material: 'Silk', embellishment: '', features: ['Handloom', 'Hand block printed'] },
    'anaya-chikankari-kurti': { style: 'Casual', length: 'Knee-length', pattern: 'Embroidered', material: 'Cotton', neckline: 'Round neck', sleeve: 'Three-quarter', embellishment: 'Embroidery', features: ['With embroidery', 'Hand finished'] },
    'block-print-cotton-kurti': { style: 'Casual', length: 'Knee-length', pattern: 'Block print', material: 'Cotton', neckline: 'Round neck', sleeve: 'Three-quarter', embellishment: '', features: ['Hand block printed'] },
    'silk-blend-straight-kurti': { style: 'Festive', length: 'Knee-length', pattern: 'Zari woven', material: 'Silk blend', neckline: 'Round neck', sleeve: 'Three-quarter', embellishment: 'Zari', features: ['For weddings'] },
    'linen-mandarin-collar-kurti': { style: 'Workwear', length: 'Knee-length', pattern: 'Solid', material: 'Linen', neckline: 'Mandarin collar', sleeve: 'Three-quarter', embellishment: '', features: [] },
    'soiree-satin-midi-dress': { style: 'Formal', length: 'Midi', silhouette: 'Slip', pattern: 'Solid', material: 'Satin', neckline: 'Scoop neck', sleeve: 'Sleeveless', embellishment: '', features: ['Fully lined', 'For weddings'] },
    'crepe-wrap-dress': { style: 'Workwear', length: 'Midi', silhouette: 'Wrap', pattern: 'Solid', material: 'Crepe', neckline: 'V-neck', sleeve: 'Three-quarter', embellishment: '', features: [] },
    'floral-voile-maxi-dress': { style: 'Casual', length: 'Maxi', silhouette: 'A-line', pattern: 'Floral', material: 'Cotton', neckline: 'Square neck', sleeve: 'Sleeveless', embellishment: '', features: ['Fully lined'] },
    'pleated-shirt-dress': { style: 'Workwear', length: 'Midi', silhouette: 'Shirt dress', pattern: 'Striped', material: 'Cotton', neckline: 'Collared', sleeve: 'Long', embellishment: '', features: [] },
    'silk-charmeuse-camisole': { style: 'Casual', length: 'Hip-length', pattern: 'Solid', material: 'Silk', neckline: 'Scoop neck', sleeve: 'Sleeveless', embellishment: '', features: [] },
    'ruffle-collar-blouse': { style: 'Workwear', length: 'Hip-length', pattern: 'Solid', material: 'Silk blend', neckline: 'Ruffle collar', sleeve: 'Long', embellishment: '', features: [] },
    'linen-boxy-shirt': { style: 'Casual', length: 'Hip-length', pattern: 'Striped', material: 'Linen', neckline: 'Collared', sleeve: 'Short', embellishment: '', features: [] },
    'embroidered-peplum-top': { style: 'Festive', length: 'Hip-length', pattern: 'Embroidered', material: 'Silk', neckline: 'Round neck', sleeve: 'Short', embellishment: 'Zari', features: ['With embroidery'] },
    'hand-painted-silk-scarf': { style: 'Casual', pattern: 'Floral', material: 'Silk', embellishment: '', features: ['Hand finished'] },
    'structured-leather-tote': { style: 'Workwear', pattern: 'Solid', material: 'Leather', embellishment: '', features: [] },
    'gold-plated-jhumka-earrings': { style: 'Festive', pattern: 'Solid', material: 'Brass', embellishment: 'Pearl', features: ['For weddings', 'Hand finished'] },
    'embroidered-potli-clutch': { style: 'Festive', pattern: 'Embroidered', material: 'Silk', embellishment: 'Zari', features: ['With embroidery', 'For weddings'] },
    'zardozi-bridal-lehenga': { style: 'Wedding', length: 'Floor-length', silhouette: 'A-line', pattern: 'Embroidered', material: 'Silk', neckline: 'V-neck', sleeve: 'Three-quarter', embellishment: 'Zardozi', features: ['For weddings', 'With embroidery', 'Fully lined'] },
    'rose-embroidered-lehenga-set': { style: 'Wedding', length: 'Floor-length', silhouette: 'A-line', pattern: 'Embroidered', material: 'Silk', neckline: 'Round neck', sleeve: 'Short', embellishment: 'Sequins', features: ['For weddings', 'With embroidery', 'Fully lined'] },
    'marigold-mehendi-lehenga': { style: 'Festive', length: 'Floor-length', silhouette: 'A-line', pattern: 'Floral', material: 'Silk blend', neckline: 'Round neck', sleeve: 'Short', embellishment: 'Gota', features: ['Hand finished'] },
    'block-print-anarkali-set': { style: 'Casual', length: 'Floor-length', silhouette: 'Anarkali', pattern: 'Block print', material: 'Cotton', neckline: 'Round neck', sleeve: 'Three-quarter', embellishment: '', features: ['Hand block printed'] },
    'indigo-embroidered-kurta-set': { style: 'Festive', length: 'Knee-length', pattern: 'Embroidered', material: 'Cotton silk', neckline: 'Round neck', sleeve: 'Three-quarter', embellishment: 'Thread work', features: ['With embroidery'] }
  };

  root.BFSeed = { COLORS, CATEGORIES, CARE, SIZES, PRODUCTS, CUSTOMERS, PROMOS, ATTRS };
})(typeof window !== 'undefined' ? window : globalThis);
