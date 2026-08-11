# Nova Mobile — Owner's Guide

Welcome! This folder contains the complete **Nova Mobile** website. It is a
**static site** — plain HTML, CSS and JavaScript with your content stored in a
few easy-to-edit text files. **No coding knowledge is needed** to update your
products, prices or contact details: you edit a `.json` file, save it, and
refresh the browser.

> The footer must always keep this credit line visible: **Designed &amp; Developed by Imran AF**.

---

## 1. The file structure (what's what)

```
nova-mobile/
├── index.html               The homepage
├── style.css                All colours, fonts, spacing (the design system)
├── 404.html                 "Page not found" page
├── manifest.json            Browser install metadata
├── robots.txt, sitemap.xml  For search engines
├── data/                    ★ YOUR CONTENT LIVES HERE ★
│   ├── settings.json        Global site settings (contact, homepage, policies)
│   ├── mobiles.json         All phones
│   ├── accessories.json     All non-phone products
│   ├── brands.json          The brands you carry
│   ├── categories.json      The shop categories (New, Used, Audio, etc.)
│   └── reviews.json         Customer reviews
├── js/                      The "engine" — you normally never touch these
├── images/                  All images (one flat folder)
└── pages/                   The inner pages (catalog, product, sell, compare…)
```

**Golden rule:** to change any product, price, image, phone number or policy,
edit the matching file in `data/`. Do **not** edit the HTML or JS files.

---

## 2. Products (phones & accessories)

Every product lives in `data/mobiles.json` (phones) or `data/accessories.json`
(accessories). Each one looks like this:

```json
{
  "id": "p001",
  "slug": "iphone-15-pro-max",
  "brand": "Apple",
  "name": "iPhone 15 Pro Max",
  "category": "smartphones",
  "condition": "new",
  "currency": "PKR",
  "availability": "in-stock",
  "featured": true,
  "ptaStatus": "PTA Approved",
  "warranty": "PLACEHOLDER",
  "description": "iPhone 15 Pro Max. Forged in titanium …",
  "specifications": {
    "display": "6.7\" Super Retina XDR OLED, 120Hz",
    "chip": "Apple A17 Pro",
    "camera": "48MP Main + 5x Telephoto",
    "battery": "Up to 29h video playback"
  },
  "batteryHealth": null,
  "keywords": ["iphone", "apple", "flagship"],
  "compatibleAccessories": ["acc002"],
  "installmentEligible": true,
  "variants": [
    { "sku": "IP15PM-256-NT", "color": "Natural Titanium", "storage": "256GB",
      "price": 349999, "compareAtPrice": 379999,
      "availability": "in-stock",
      "images": ["images/iphone-15-pro-max-natural-titanium.jpg"] }
  ]
}
```

### Add a phone
1. Open `data/mobiles.json`.
2. Copy any existing phone block (everything between `{` and `}`), paste it at
   the end of the list, after the last item's `]`.
3. Change its `id` (must be unique, e.g. `p016`), `slug` (a short web address
   like `samsung-galaxy-a35`), `name`, `brand`, prices, etc.
4. Make sure the comma after the previous item is still there, and that the new
   item has no trailing comma. Save the file and refresh the browser.

### Edit / remove
- **Change a price:** find the `price` inside a `variant` and type the new
  number (in rupees, no commas — `349999`). If you want to show a "was"
  crossed-out price, set `compareAtPrice` to the higher old price; delete the
  `compareAtPrice` line to hide it.
- **Remove a phone:** delete its entire `{ ... }` block (and the comma before
  it).

### Accessories
Same idea but in `data/accessories.json`. Set `"category": "accessories"` or
`"category": "audio"` depending on where it should appear.

---

## 3. Colors, storage & images (variants)

The **`variants`** array is the single source of truth for each buyable
combination of *color + storage*. One entry per combination.

- **Add a storage size / color:** copy a variant, change its `sku` (must be
  unique), `color`, `storage`, `price`, and `images`.
- **Change an image:** point the `images` line to a file in `images/`. File
  names use the pattern `slug-color.jpg`, e.g.
  `images/iphone-15-pro-max-blue-titanium.jpg`.
- Every image needs a matching file in the `images/` folder. If a file is
  missing the site automatically shows a grey placeholder instead — nothing
  breaks, but replace it with the real photo when you have it.

> Tip: the site reads colors/storage automatically from `variants`, so you never
> maintain a separate "colors" or "storage" list.

---

## 4. Brands & categories

- **Brands:** `data/brands.json`. To add a brand copy an existing entry and
  change `slug`, `name`, `tagline`. Set `"featured": true` to show it on the
  homepage "Popular Brands" row.
- **Categories:** `data/categories.json`. Same idea; the `slug` is used in web
  links (e.g. `?category=accessories`).

---

## 5. Contact details & WhatsApp number  ★ IMPORTANT ★

All contact info and the WhatsApp number are in **`data/settings.json`** under
`"contact"`:

```json
"contact": {
  "whatsappNumber": "PLACEHOLDER_ADD_REAL_NUMBER",
  "phone": "PLACEHOLDER",
  "email": "PLACEHOLDER",
  "address": "PLACEHOLDER",
  "city": "PLACEHOLDER",
  "hours": "PLACEHOLDER"
}
```

Replace each `PLACEHOLDER` with the real value. For the WhatsApp number use the
**country code without `+` or spaces** — for Pakistan that is `923001234567`
(after the leading `92`, drop the first `0` of the local number).

The site builds every "Order on WhatsApp" / "Get Quote" button from this number
automatically. **Never** hardcode the number anywhere else.

> Until you add a real number, the WhatsApp buttons still work but open the
> `wa.me` link without a recipient. This is intentional.

---

## 6. Homepage content & policies

Everything on the homepage and the "policies" text lives in `data/settings.json`:

- **Hero:** edit the `heroSlides` block (headline, subheading, button labels,
  and the featured product shown in the corner card).
- **Trust badges:** edit the `trustBadges` list (e.g. "100% Authentic",
  "Fast Delivery").
- **Policies:** `paymentMethods`, `delivery`, `warranty`, `returns` are the
  simple text shown where the store policies appear. They are set to
  `PLACEHOLDER` until you confirm them.
- **Footer / SEO:** the footer brand text and the default page
  title/description are under `footer` and `seoDefaults`.

---

## 7. Testing locally (you must use a small server)

You **cannot** just double-click `index.html` to preview it on your computer.
Modern browsers block a website from reading its own data files when opened as a
plain `file://`. That is a browser security rule — **not** a problem with the
site, and it does **not** affect the deployed website.

To preview, start a tiny local server:

**Option A — Python** (if Python is installed):
```
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Option B — VS Code:** install the **Live Server** extension, right-click
`index.html`, choose "Open with Live Server".

Any change you make to `data/*.json` only needs a browser refresh — no rebuild.

---

## 8. Going live (deploying to a static host)

Because the site is static, you can put the whole `nova-mobile/` folder on any
host that serves files. Easy options:

- **Netlify / Vercel:** drag-and-drop the folder, or connect your Git repo. Set
  the build command to nothing and the publish directory to `nova-mobile`.
- **GitHub Pages:** push the folder to a repo and enable Pages on the
  `main` branch / root.
- **Any cPanel / shared hosting:** upload the files to `public_html`.

After deploying:
1. Replace `your-domain.com` in `sitemap.xml` and `robots.txt` with your real
   domain.
2. Put your real WhatsApp number and contact details in `data/settings.json`.
3. Replace the placeholder product images with your real photography (see
   `IMAGES.md` for the full checklist).

---

## 9. Useful tips

- **Share a filtered view:** the catalog uses the web address to store filters,
  e.g. `pages/catalog.html?category=smartphones&brand=apple`. You can copy any
  such link and share it.
- **Wishlist / Order List / Compare** are saved in the visitor's own browser
  (localStorage) — they are personal to each visitor and need no account.
- **Sell Your Phone:** the form does not submit data anywhere; it just composes
  a WhatsApp message to your number.
