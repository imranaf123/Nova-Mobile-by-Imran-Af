/* Nova Mobile — render.js
   One set of shared render functions. Every product/category/brand is drawn
   by these templates — never hand-written HTML blocks per item. */
(function () {
  "use strict";

  var BASE = window.NOVA_BASE || "";
  function link(page) { return BASE + page; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function imgWithFallback(path, alt, extra) {
    var src = NovaData.img(path);
    return '<img src="' + src + '" alt="' + esc(alt) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + BASE + 'images/placeholder.jpg\'"' + (extra || "") + ">";
  }

  function uniqueVariants(product) {
    var colors = [], storages = [];
    (product.variants || []).forEach(function (v) {
      if (v.color && colors.indexOf(v.color) < 0) colors.push(v.color);
      if (v.storage && storages.indexOf(v.storage) < 0) storages.push(v.storage);
    });
    return { colors: colors, storages: storages };
  }

  function colorHex(name) {
    var map = {
      "natural titanium": "#b3aeaa", "blue titanium": "#464c55", "white titanium": "#f3f2f8",
      "black titanium": "#3f3e3c", "midnight": "#1f2937", "deep purple": "#4a3f68",
      "titanium gray": "#8f8f8f", "titanium black": "#2b2b2e", "onyx black": "#1e1e1e",
      "awesome navy": "#232b46", "black": "#1e1e1e", "white": "#f4f4f4",
      "pink": "#f5c6d0", "peacock green": "#0f766e", "rome green": "#4d7c0f",
      "obsidian": "#1a1a1a", "dark grey": "#333333", "phantom black": "#161616",
      "midnight black": "#171717", "navy": "#1e3a5f", "green": "#4d7c0f",
      "blue": "#3d4b68", "graphite": "#5c5c5c", "silver": "#e5e7eb"
    };
    var key = String(name || "").toLowerCase();
    return map[key] || "#9ca3af";
  }

  function badgesFor(product, variant) {
    var html = "";
    var v = variant || (product.variants && product.variants[0]);
    var hasSale = v && v.compareAtPrice && v.compareAtPrice > v.price;
    if (product.condition === "used") {
      html += '<span class="badge badge-sale">Used</span>';
    } else if (product.featured) {
      html += '<span class="badge badge-new">New</span>';
    }
    if (hasSale) html += '<span class="badge badge-sale">Sale</span>';
    if (product.ptaStatus === "PTA Approved") html += '<span class="badge badge-pta">PTA</span>';
    else if (product.ptaStatus === "Non-PTA") html += '<span class="badge badge-nonpta">Non-PTA</span>';
    return html;
  }

  /* ---------------- Product card ---------------- */
  function renderProductCard(product, opts) {
    opts = opts || {};
    var v = product.variants && product.variants[0];
    var price = v ? v.price : 0;
    var compare = v ? v.compareAtPrice : null;
    var hasSale = compare && compare > price;
    var uniq = uniqueVariants(product);
    var firstImg = v && v.images && v.images[0];
    var alt = product.name + " — " + (v ? v.color + " " + v.storage : "").trim();

    var swatches = uniq.colors.slice(0, 4).map(function (c) {
      return '<span class="swatch" style="background:' + colorHex(c) + '" title="' + esc(c) + '"></span>';
    }).join("");

    var priceHtml = hasSale
      ? '<div class="pc-price sale">' + NovaData.formatPrice(price) + ' <span class="was">' + NovaData.formatPrice(compare) + "</span></div>"
      : '<div class="pc-price">' + NovaData.formatPrice(price) + "</div>";

    var variantLine = (v ? [v.storage, v.color].filter(Boolean).join(" • ") : "");
    var productUrl = link("pages/product.html?slug=" + encodeURIComponent(product.slug));

    var html = '<article class="product-card" data-slug="' + esc(product.slug) + '">';
    html += '<div class="pc-media">';
    html += '<div class="pc-badges">' + badgesFor(product, v) + "</div>";
    html += '<button class="pc-wish" data-wish="' + esc(product.slug) + '" data-sku="' + esc(v ? v.sku : "") + '" aria-label="Toggle wishlist"><span class="ms">favorite</span></button>';
    html += '<a href="' + productUrl + '" tabindex="-1" aria-hidden="true">' + imgWithFallback(firstImg, alt, ' class="pc-img"') + "</a>";
    html += "</div>";
    html += '<a class="pc-name" href="' + productUrl + '">' + esc(product.name) + "</a>";
    if (variantLine) html += '<div class="pc-variant">' + esc(variantLine) + "</div>";
    if (swatches) html += '<div class="pc-colors">' + swatches + "</div>";
    html += '<div class="pc-foot">' + priceHtml;
    html += '<button class="pc-add quick" data-add="' + esc(product.slug) + '" data-sku="' + esc(v ? v.sku : "") + '"><span class="ms sm">shopping_cart</span>Quick Add</button>';
    html += "</div>";
    html += "</article>";
    return html;
  }

  /* ---------------- Hero slide ---------------- */
  function renderHeroSlide(slide, product) {
    var primaryHref = slide.primaryCta && slide.primaryCta.link ? link(slide.primaryCta.link) : "#";
    var secondaryHref = slide.secondaryCta && slide.secondaryCta.link ? link(slide.secondaryCta.link) : "#";

    var featUrl = "#";
    var featCard = "";
    // Build the featured product card from LIVE product data so the name and
    // price always match data/mobiles.json — never stale or duplicated HTML.
    if (product) {
      featUrl = link("pages/product.html?slug=" + encodeURIComponent(product.slug));
      var v = product.variants && product.variants[0];
      var priceLabel = v ? NovaData.formatPrice(v.price) : "";
      if (v && v.compareAtPrice && v.compareAtPrice > v.price) {
        priceLabel = "From " + NovaData.formatPrice(v.price);
      }
      var metaParts = [];
      if (product.ptaStatus) metaParts.push(product.ptaStatus);
      if (product.warranty && product.warranty !== "PLACEHOLDER") metaParts.push(product.warranty);
      else metaParts.push("Warranty on WhatsApp");
      var meta = metaParts.join(" • ");
      featCard =
        '<a class="hero-feature" href="' + featUrl + '" aria-label="View ' + esc(product.name) + '">' +
        '<div class="hf-head"><h3>' + esc(product.name) + '</h3><span class="badge badge-new">' + esc(slide.badge || "NEW") + '</span></div>' +
        '<div class="price">' + esc(priceLabel) + '</div>' +
        '<div class="meta">' + esc(meta) + '</div>' +
        '<span class="btn btn-whatsapp btn-block"><span class="ms sm">chat</span>Order via WhatsApp</span>' +
        "</a>";
    }

    return [
      '<section class="hero">',
      '<div class="hero-copy">',
      '<span class="eyebrow">' + esc(slide.eyebrow || "NEW ARRIVALS") + "</span>",
      '<h1 class="hero-title">' + esc(slide.title || "FIND YOUR NEXT PHONE") + "</h1>",
      '<p class="hero-subtitle">' + esc(slide.subtitle || "") + "</p>",
      '<div class="hero-ctas">',
      '<a class="btn btn-lg btn-primary" href="' + esc(primaryHref) + '">' + esc(slide.primaryCta.label) + ' <span class="ms">arrow_forward</span></a>',
      '<a class="btn btn-lg btn-outline" href="' + esc(secondaryHref) + '">' + esc(slide.secondaryCta.label) + "</a>",
      "</div></div>",
      '<div class="hero-visual">',
      imgWithFallback(slide.image, esc(slide.eyebrow || "Nova Mobile hero")),
      featCard,
      "</div></section>"
    ].join("");
  }

  /* ---------------- Brand card ---------------- */
  function renderBrandCard(brand) {
    return '<a class="brand-card" href="' + link("pages/catalog.html?brand=" + encodeURIComponent(brand.slug)) + '">' + esc(brand.name) + "</a>";
  }

  /* ---------------- Category card ----------------
     The "deals" category is rendered as a distinct dark flash-sale card
     (image-less by design) so it never shows as a blank/white tile. */
  function renderCategoryCard(cat) {
    var isDeal = cat.slug === "deals";
    if (isDeal) {
      return '<a class="category-card deal" href="' + link("pages/catalog.html?deal=1") + '">' +
        '<span class="scrim"></span>' +
        '<div class="deal-inner"><span class="ms lg">local_fire_department</span>' +
        "<h3>Hot Deals</h3><span class=\"deal-sub\">Up to 40% off flagships</span></div>" +
        "</a>";
    }
    return '<a class="category-card" href="' + link("pages/catalog.html?category=" + encodeURIComponent(cat.slug)) + '">' +
      imgWithFallback(cat.image, esc(cat.name)) +
      '<span class="scrim"></span>' +
      "<h3>" + esc(cat.name) + "</h3>" +
      "</a>";
  }

  /* ---------------- Specifications ---------------- */
  function renderSpecifications(product) {
    var specs = product.specifications || {};
    var keys = Object.keys(specs);
    var html = '<section class="section"><h2 class="section-title mb-3">Key Specifications</h2><div class="spec-grid">';
    var icons = { display: "smartphone", chip: "memory", camera: "photo_camera", battery: "battery_charging_full", storage: "sd_storage", connectivity: "wifi" };
    keys.forEach(function (k) {
      html += '<div class="spec-tile"><div class="icon"><span class="ms xl">' + (icons[k] || "info") + '</span></div><div><div class="k">' + esc(k) + '</div><div class="v">' + esc(specs[k]) + "</div></div></div>";
    });
    html += "</div></section>";

    // Battery health for used devices (hidden when null).
    if (product.batteryHealth != null) {
      html += '<div class="section"><div class="inbox" style="border-color:var(--outline-variant)"><h3 class="section-title mb-3">Battery Health</h3><div class="spec-tile" style="align-items:flex-start"><div class="icon"><span class="ms xl">battery_full</span></div><div><div class="k">Battery Health</div><div class="v">' + esc(product.batteryHealth + "%") + "</div></div></div></div></div>";
    }
    return html;
  }

  /* ---------------- Variant selector ---------------- */
  function renderVariantSelector(product) {
    var uniq = uniqueVariants(product);
    var html = "";
    if (uniq.storages.length > 1) {
      html += '<div class="selector"><span class="sel-label">Storage</span><div class="option-row" data-role="storage">';
      uniq.storages.forEach(function (s, i) {
        html += '<button type="button" class="option-btn' + (i === 0 ? " active" : "") + '" data-storage="' + esc(s) + '">' + esc(s) + "</button>";
      });
      html += "</div></div>";
    }
    if (uniq.colors.length > 1) {
      html += '<div class="selector"><span class="sel-label">Color: <span class="current" data-role="color-label">' + esc(uniq.colors[0]) + "</span></span><div class=\"option-row\" data-role=\"color\">";
      uniq.colors.forEach(function (c, i) {
        html += '<button type="button" class="color-opt' + (i === 0 ? " active" : "") + '" data-color="' + esc(c) + '" aria-label="' + esc(c) + '"><span class="dot" style="background:' + colorHex(c) + '"></span></button>';
      });
      html += "</div></div>";
    }
    return html;
  }

  function findVariant(product, color, storage) {
    return (product.variants || []).find(function (v) {
      return (!color || v.color === color) && (!storage || v.storage === storage);
    }) || (product.variants || [])[0];
  }

  /* ---------------- Footer ---------------- */
  function renderFooter(settings) {
    var s = settings || {};
    var name = s.siteName || "Nova Mobile";
    var tagline = s.tagline || "Find Your Next Phone";
    var c = s.contact || {};
    var social = s.social || {};
    var credit = (s.footer && s.footer.developerCredit) || "Designed &amp; Developed by Imran AF";

    var socialHtml = "";
    if (social.instagram || social.facebook || social.tiktok) {
      socialHtml = '<div class="footer-social">' +
        (social.instagram ? '<a href="' + esc(social.instagram) + '" aria-label="Instagram"><span class="ms">camera</span></a>' : "") +
        (social.facebook ? '<a href="' + esc(social.facebook) + '" aria-label="Facebook"><span class="ms">thumb_up</span></a>' : "") +
        (social.tiktok ? '<a href="' + esc(social.tiktok) + '" aria-label="TikTok"><span class="ms">music_note</span></a>' : "") +
        "</div>";
    }

    return '<footer class="site-footer" id="site-footer">' +
      '<div class="footer-grid">' +
      '<div class="footer-brand"><span class="brand">' + esc(name) + "</span><p>" + esc(tagline) + ' — your premium destination for the latest smartphones and authentic tech accessories.</p>' + socialHtml + "</div>" +
      '<div class="footer-col"><h4>Shop</h4><ul>' +
      '<li><a href="' + link("pages/catalog.html?category=smartphones") + '">Smartphones</a></li>' +
      '<li><a href="' + link("pages/catalog.html?condition=used") + '">Used Devices</a></li>' +
      '<li><a href="' + link("pages/catalog.html?category=accessories") + '">Accessories</a></li>' +
      '<li><a href="' + link("pages/catalog.html?deal=1") + '">Hot Deals</a></li></ul></div>' +
      '<div class="footer-col"><h4>Customer Service</h4><ul>' +
      '<li><a href="' + link("pages/sell.html") + '">Sell Your Phone</a></li>' +
      '<li><a href="' + link("pages/compare.html") + '">Compare Phones</a></li>' +
      '<li><a href="' + link("pages/order-list.html") + '">Order List</a></li>' +
      '<li><a href="' + link("pages/wishlist.html") + '">Wishlist</a></li></ul></div>' +
      '<div class="footer-col"><h4>Contact</h4><ul>' +
      '<li class="contact"><span class="ms sm">call</span> ' + esc(c.phone || "PLACEHOLDER") + "</li>" +
      '<li class="contact"><span class="ms sm">mail</span> ' + esc(c.email || "PLACEHOLDER") + "</li>" +
      '<li class="contact"><span class="ms sm">location_on</span> ' + esc(c.address || "PLACEHOLDER") + "</li>" +
      '<li class="contact"><span class="ms sm">location_city</span> ' + esc(c.city || "PLACEHOLDER") + "</li>" +
      '<li class="contact"><span class="ms sm">schedule</span> ' + esc(c.hours || "PLACEHOLDER") + "</li></ul></div>" +
      "</div>" +
      '<div class="footer-bottom">' +
      '<div><div>© ' + new Date().getFullYear() + " " + esc(name) + '. All rights reserved.</div><div class="credit">' + credit + "</div></div>" +
      '<div style="display:flex;gap:12px;color:var(--outline)"><span class="ms lg">payments</span><span class="ms lg">credit_card</span></div>' +
      "</div></footer>";
  }

  /* ---------------- Reviews (sample/demo) ----------------
     Reviews must always be clearly labeled. Real reviews (r.demo === false)
     show as normal; demo/sample reviews are visibly marked "SAMPLE" and a
     disclosure banner is shown whenever the section contains sample data. */
  function renderReviews(reviews) {
    var real = reviews.filter(function (r) { return !r.demo; });
    var demo = reviews.filter(function (r) { return r.demo; });

    var banner = "";
    if (demo.length) {
      banner = '<div class="review-demo-note"><span class="ms sm">info</span>Sample/demo reviews shown for preview only — these are placeholders, not real customer feedback.</div>';
    }

    if (real.length === 0 && demo.length === 0) {
      return '<p class="muted">No reviews yet.</p>';
    }

    var cards = real.map(card).concat(demo.map(card));
    return banner + '<div class="grid">' + cards + "</div>";

    function card(r) {
      return '<div class="product-card" style="gap:8px">' +
        (r.demo ? '<span class="badge badge-pta" style="align-self:flex-start">Sample</span>' : "") +
        '<div class="stars" style="color:#f59e0b">' + "★".repeat(r.rating) + '</div>' +
        "<strong>" + esc(r.title) + "</strong><p class=\"muted\">" + esc(r.text) + "</p>" +
        '<span class="outline-text">— ' + esc(r.name) + (r.demo ? " (sample)" : "") + "</span></div>";
    }
  }

  window.Render = {
    renderProductCard: renderProductCard,
    renderHeroSlide: renderHeroSlide,
    renderBrandCard: renderBrandCard,
    renderCategoryCard: renderCategoryCard,
    renderSpecifications: renderSpecifications,
    renderVariantSelector: renderVariantSelector,
    renderFooter: renderFooter,
    renderReviews: renderReviews,
    uniqueVariants: uniqueVariants,
    findVariant: findVariant,
    colorHex: colorHex,
    badgesFor: badgesFor
  };
})();
