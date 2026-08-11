/* Nova Mobile — main.js
   Per-page entry point. Reads <body data-page="..."> to decide which
   initializer to run, then wires up shared behaviour (footer, wishlist,
   quick-add, search, order-count badges, toasts). */
(function () {
  "use strict";

  var BASE = window.NOVA_BASE || "";
  var page = document.body.getAttribute("data-page") || "home";
  var data = null;

  /* ---------------- Toast ---------------- */
  var toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  /* ---------------- Search wiring ---------------- */
  function wireSearch() {
    var box = document.querySelector("[data-search-input]");
    if (!box) return;
    box.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        window.location.href = BASE + "pages/search.html?q=" + encodeURIComponent(box.value.trim());
      }
    });
  }

  /* ---------------- Wishlist + quick-add (delegated) ---------------- */
  function refreshWishlistButtons() {
    document.querySelectorAll("[data-wish]").forEach(function (btn) {
      var slug = btn.getAttribute("data-wish");
      var sku = btn.getAttribute("data-sku");
      btn.classList.toggle("saved", NovaState.inWishlist(slug, sku));
    });
  }

  function wireGlobalEvents() {
    document.addEventListener("click", function (e) {
      var wish = e.target.closest("[data-wish]");
      if (wish) {
        e.preventDefault();
        var slug = wish.getAttribute("data-wish");
        var sku = wish.getAttribute("data-sku");
        var added = NovaState.toggleWishlist(slug, sku);
        toast(added ? "Added to wishlist" : "Removed from wishlist");
        refreshWishlistButtons();
        return;
      }
      var add = e.target.closest("[data-add]");
      if (add) {
        e.preventDefault();
        NovaState.addToOrderList(add.getAttribute("data-add"), add.getAttribute("data-sku"), 1);
        toast("Added to your order list");
        return;
      }
      var openWish = e.target.closest("[data-goto-wishlist]");
      if (openWish) { e.preventDefault(); window.location.href = BASE + "pages/wishlist.html"; }
      var goSearch = e.target.closest("[data-goto-search]");
      if (goSearch) { e.preventDefault(); window.location.href = BASE + "pages/search.html"; }
    });
    NovaState.on("wishlist", refreshWishlistButtons);
  }

  /* =================================================================
     HOME
     ================================================================= */
  /* Hero carousel: auto-rotates through heroSlides (each referencing a
     productSlug), pulling live product data. Swipeable on touch, pauses on
     hover/touch-hold, respects prefers-reduced-motion. */
  function initHeroCarousel(host) {
    var slides = (data.settings.heroSlides || []).map(function (s) {
      var product = s.productSlug ? data.getProduct(s.productSlug) : null;
      return { slide: s, product: product };
    }).filter(function (x) { return x.slide; });

    if (!slides.length) { host.innerHTML = ""; return; }

    // Build the carousel DOM
    var track = document.createElement("div");
    track.className = "hero-track";
    slides.forEach(function (x, i) {
      var el = document.createElement("div");
      el.className = "hero-slide";
      el.dataset.index = i;
      el.dataset.slug = (x.product && x.product.slug) || "";
      el.innerHTML = Render.renderHeroSlide(x.slide, x.product);
      track.appendChild(el);
    });
    host.appendChild(track);

    var dots = document.createElement("div");
    dots.className = "hero-dots";
    dots.setAttribute("role", "tablist");
    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.className = "hero-dot" + (i === 0 ? " active" : "");
      b.setAttribute("aria-label", "Go to slide " + (i + 1));
      b.dataset.dot = i;
      dots.appendChild(b);
    });
    host.appendChild(dots);

    var current = 0;
    var timer = null;
    var INTERVAL = 3500;

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + current * 100 + "%)";
      dots.querySelectorAll(".hero-dot").forEach(function (d, di) {
        d.classList.toggle("active", di === current);
      });
    }
    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function start() {
      // Respect prefers-reduced-motion: never auto-advance.
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (timer) clearInterval(timer);
      timer = setInterval(next, INTERVAL);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    // Pause on hover (desktop) and touch-hold (mobile)
    host.addEventListener("mouseenter", stop);
    host.addEventListener("mouseleave", start);
    host.addEventListener("touchstart", function () { stop(); }, { passive: true });
    host.addEventListener("touchend", function () { start(); }, { passive: true });

    // Dot navigation
    dots.addEventListener("click", function (e) {
      var d = e.target.closest(".hero-dot");
      if (d) { stop(); goTo(+d.dataset.dot); start(); }
    });

    // Clicking/tapping the slide navigates to the product (unless an
    // interactive element like a button or link was clicked).
    host.addEventListener("click", function (e) {
      var interactive = e.target.closest("a, button");
      if (interactive) return; // let the inner link/button handle it
      var slug = slides[current].product && slides[current].product.slug;
      if (slug) window.location.href = BASE + "pages/product.html?slug=" + encodeURIComponent(slug);
    });

    // Touch swipe
    var startX = null;
    host.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    host.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) {
        stop();
        if (dx < 0) next(); else prev();
        start();
      }
      startX = null;
    }, { passive: true });

    // Keyboard accessibility on the track
    track.setAttribute("aria-live", "polite");

    start();
  }

  function initHome() {
    var s = data.settings;

    var heroWrap = document.getElementById("hero");
    if (heroWrap) initHeroCarousel(heroWrap);

    var featuredWrap = document.getElementById("featured-products");
    if (featuredWrap) {
      var featured = data.allProducts.filter(function (p) { return p.featured; });
      if (featured.length) featuredWrap.innerHTML = featured.map(Render.renderProductCard).join("");
    }

    var brandsWrap = document.getElementById("popular-brands");
    if (brandsWrap) {
      var brands = data.brands.filter(function (b) { return b.featured; }).slice(0, 6);
      brandsWrap.innerHTML = brands.map(Render.renderBrandCard).join("");
    }

    var catsWrap = document.getElementById("category-cards");
    if (catsWrap) {
      catsWrap.innerHTML = data.categories.map(Render.renderCategoryCard).join("");
    }

    var trustWrap = document.getElementById("trust-badges");
    if (trustWrap && s.trustBadges) {
      trustWrap.innerHTML = s.trustBadges.map(function (b) {
        return '<div class="trust-item"><div class="trust-icon"><span class="ms xl">' + b.icon + '</span></div><div><h4>' + b.name || b.title + "</h4><p>" + b.text + "</p></div></div>";
      }).join("");
    }
    refreshWishlistButtons();
  }

  /* =================================================================
     CATALOG
     ================================================================= */
  function catalogUrl(params) {
    var qs = [];
    ["category", "brand", "condition", "pta", "priceFrom", "priceTo", "deal", "sort"].forEach(function (k) {
      if (params[k] != null && params[k] !== "") qs.push(k + "=" + encodeURIComponent(params[k]));
    });
    return BASE + "pages/catalog.html" + (qs.length ? "?" + qs.join("&") : "");
  }

  function initCatalog() {
    var url = new URLSearchParams(window.location.search);
    var state = {
      category: url.get("category") || "",
      brand: url.get("brand") || "",
      condition: url.get("condition") || "",
      pta: url.get("pta") || "",
      priceFrom: url.get("priceFrom") || "",
      priceTo: url.get("priceTo") || "",
      deal: url.get("deal") || "",
      sort: url.get("sort") || ""
    };

    // Build filter controls from data (shared by desktop panel + mobile drawer)
    function buildFilterPanel(host) {
      var conds = ["new", "used"];
      var html = '<div class="filter-group"><h4>Brand</h4>';
      html += '<label><input type="radio" name="fbrand" value=""><strong>All Brands</strong></label>';
      html += data.brands.map(function (b) {
        return '<label><input type="radio" name="fbrand" value="' + b.slug + '"' + (state.brand === b.slug ? " checked" : "") + "> " + b.name + "</label>";
      }).join("");
      html += "</div>";

      html += '<div class="filter-group"><h4>Category</h4>';
      html += data.categories.map(function (c) {
        return '<label><input type="checkbox" data-cat="' + c.slug + '" value="' + c.slug + '"' + (state.category === c.slug ? " checked" : "") + "> " + c.name + "</label>";
      }).join("");
      html += "</div>";

      html += '<div class="filter-group"><h4>Condition</h4>';
      html += '<label><input type="radio" name="fcond" value=""><strong>Any</strong></label>';
      html += conds.map(function (c) {
        return '<label><input type="radio" name="fcond" value="' + c + '"' + (state.condition === c ? " checked" : "") + "> " + c + "</label>";
      }).join("");
      html += "</div>";

      html += '<div class="filter-group"><h4>PTA Status</h4>';
      html += '<label><input type="radio" name="fpta" value=""><strong>Any</strong></label>';
      ["PTA Approved", "Non-PTA"].forEach(function (p) {
        html += '<label><input type="radio" name="fpta" value="' + p + '"' + (state.pta === p ? " checked" : "") + "> " + p + "</label>";
      });
      html += "</div>";

      html += '<div class="filter-group"><h4>Price (PKR)</h4><div class="price-inputs"><input type="number" id="fFrom" placeholder="Min" value="' + state.priceFrom + '"><span>—</span><input type="number" id="fTo" placeholder="Max" value="' + state.priceTo + '"></div></div>';

      html += '<div class="filter-actions"><button type="button" class="btn btn-outline" data-apply-filters>Apply</button><button type="button" class="btn btn-ghost" data-clear-filters>Clear</button></div>';
      host.innerHTML = html;

      function applyFromPanel() {
        var b = host.querySelector('input[name="fbrand"]:checked');
        var cond = host.querySelector('input[name="fcond"]:checked');
        var pta = host.querySelector('input[name="fpta"]:checked');
        var cats = host.querySelectorAll("input[data-cat]:checked");
        var catSlug = cats.length ? cats[0].value : "";
        var fFrom = host.querySelector("#fFrom");
        var fTo = host.querySelector("#fTo");
        var params = {
          brand: b && b.value ? b.value : "",
          category: catSlug,
          condition: cond && cond.value ? cond.value : "",
          pta: pta && pta.value ? pta.value : "",
          priceFrom: fFrom ? fFrom.value : "",
          priceTo: fTo ? fTo.value : "",
          deal: state.deal
        };
        window.location.href = catalogUrl(params);
      }
      host.querySelector("[data-apply-filters]").addEventListener("click", applyFromPanel);
      host.querySelector("[data-clear-filters]").addEventListener("click", function () {
        window.location.href = BASE + "pages/catalog.html";
      });
    }

    var panel = document.getElementById("filter-panel");
    if (panel) buildFilterPanel(panel);
    var panelMob = document.getElementById("filter-panel-mobile");
    if (panelMob) buildFilterPanel(panelMob);

    // Mobile filter drawer
    var openBtn = document.getElementById("mobile-filter-open");
    var backdrop = document.getElementById("filter-backdrop");
    var drawer = document.getElementById("filter-drawer");
    if (openBtn && backdrop && drawer) {
      openBtn.addEventListener("click", function () { backdrop.classList.add("open"); drawer.classList.add("open"); });
      backdrop.addEventListener("click", closeDrawer);
      drawer.querySelector("[data-close-filter]").addEventListener("click", closeDrawer);
      drawer.querySelector("[data-apply-filters]").addEventListener("click", function () { closeDrawer(); });
      function closeDrawer() { backdrop.classList.remove("open"); drawer.classList.remove("open"); }
    }

    // Sort
    var sortSel = document.getElementById("sort-select");
    if (sortSel) {
      sortSel.value = state.sort || "featured";
      sortSel.addEventListener("change", function () {
        var params = Object.assign({}, state, { sort: sortSel.value });
        window.location.href = catalogUrl(params);
      });
    }

    renderCatalogResults(state);
    refreshWishlistButtons();
  }

  function renderCatalogResults(state) {
    var grid = document.getElementById("catalog-grid");
    var countEl = document.getElementById("catalog-count");
    if (!grid) return;

    var list = data.allProducts.filter(function (p) {
      if (state.category) {
        if (state.category === "accessories") { if (p.category !== "accessories" && p.category !== "audio") return false; }
        else if (p.category !== state.category) return false;
      }
      if (state.brand) {
        if (!p.brand || p.brand.toLowerCase() !== state.brand.toLowerCase()) return false;
      }
      if (state.condition) {
        var want = state.condition === "used" ? "used" : "new";
        if (p.condition !== want) return false;
      }
      if (state.pta && p.ptaStatus !== state.pta) return false;
      if (state.deal) {
        var v0 = p.variants && p.variants[0];
        if (!v0 || !(v0.compareAtPrice && v0.compareAtPrice > v0.price)) return false;
      }
      if (state.priceFrom) { var p0 = (p.variants && p.variants[0] && p.variants[0].price) || 0; if (p0 < +state.priceFrom) return false; }
      if (state.priceTo) { var p1 = (p.variants && p.variants[0] && p.variants[0].price) || 0; if (p1 > +state.priceTo) return false; }
      return true;
    });

    if (state.sort === "price-asc") list.sort(function (a, b) { return v(a) - v(b); });
    else if (state.sort === "price-desc") list.sort(function (a, b) { return v(b) - v(a); });
    else if (state.sort === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });

    function v(p) { return (p.variants && p.variants[0] && p.variants[0].price) || 0; }

    if (countEl) countEl.textContent = list.length + (list.length === 1 ? " result" : " results");
    if (!list.length) {
      grid.innerHTML = '<div class="no-results" style="grid-column:1/-1"><span class="ms">search_off</span><h3>No products match your filters.</h3><p class="muted">Try clearing some filters.</p></div>';
    } else {
      grid.innerHTML = list.map(Render.renderProductCard).join("");
    }
    refreshWishlistButtons();
  }

  /* =================================================================
     PRODUCT DETAIL
     ================================================================= */
  function initProduct() {
    var url = new URLSearchParams(window.location.search);
    var slug = url.get("slug");
    var product = slug ? data.getProduct(slug) : null;

    if (!product) {
      document.getElementById("pdp-root").innerHTML = '<div class="no-results"><span class="ms">smartphone</span><h3>Product not found.</h3><p class="muted">It may have been removed.</p><a class="btn btn-primary mt-2" href="' + BASE + 'pages/catalog.html' + '">Browse catalog</a></div>';
      return;
    }

    NovaState.addRecentlyViewed(product.slug);

    // Breadcrumb
    var crumb = document.getElementById("pdp-breadcrumb");
    if (crumb) {
      var cat = data.categories.find(function (c) { return c.slug === product.category; });
      crumb.innerHTML =
        '<a href="' + BASE + 'index.html">Home</a><span class="sep ms sm">chevron_right</span>' +
        (cat ? '<a href="' + BASE + 'pages/catalog.html?category=' + cat.slug + '">' + cat.name + "</a><span class=\"sep ms sm\">chevron_right</span>" : "") +
        '<span class="current">' + product.name + "</span>";
    }

    // Gallery
    var first = product.variants[0];
    var gallery = document.getElementById("pdp-gallery");
    gallery.innerHTML =
      '<div class="pdp-thumbs">' +
      first.images.map(function (im, i) {
        return '<button class="pdp-thumb' + (i === 0 ? " active" : "") + '" data-thumb="' + i + '">' +
          '<img src="' + NovaData.img(im) + '" alt="' + product.name + ' thumbnail" onerror="this.onerror=null;this.src=\'' + BASE + 'images/placeholder.jpg\'">' +
          "</button>";
      }).join("") +
      '</div><div class="pdp-mainimg" data-main>' +
      '<img src="' + NovaData.img(first.images[0]) + '" alt="' + product.name + '" onerror="this.onerror=null;this.src=\'' + BASE + 'images/placeholder.jpg\'">' +
      '<span class="badge badge-pta" style="position:absolute;top:16px;left:16px">' + product.ptaStatus + "</span>" +
      "</div>";
    gallery.querySelectorAll("[data-thumb]").forEach(function (t) {
      t.addEventListener("click", function () {
        var idx = +t.getAttribute("data-thumb");
        var im = first.images[idx];
        gallery.querySelector("[data-main] img").src = NovaData.img(im);
        gallery.querySelectorAll("[data-thumb]").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
      });
    });

    // Info
    var info = document.getElementById("pdp-info");
    var v = first;
    var realReviews = data.reviews.filter(function (r) { return r.productSlug === product.slug && !r.demo; });
    var reviewNote = realReviews.length
      ? "(" + realReviews.length + (realReviews.length === 1 ? " review)" : " reviews)")
      : "(no customer reviews yet — sample shown)";
    info.innerHTML =
      '<div class="pdp-badges">' + Render.badgesFor(product, v) + "</div>" +
      '<h1 class="pdp-title">' + product.name + "</h1>" +
      '<div class="pdp-rating"><span class="stars">' + Array(4).fill('<span class="ms filled">star</span>').join("") + '<span class="ms filled">star_half</span></span>' +
      '<span class="muted">' + reviewNote + '</span>' +
      '<span class="stock"><span class="ms sm">check_circle</span> ' + (v.availability === "in-stock" ? "In Stock" : "Check availability") + "</span></div>" +
      '<div class="pdp-price"><span class="now">' + NovaData.formatPrice(v.price) + "</span>" +
      (v.compareAtPrice ? '<span class="was">' + NovaData.formatPrice(v.compareAtPrice) + '</span><div class="save">SAVE ' + NovaData.formatPrice(v.compareAtPrice - v.price) + "</div>" : "") +
      "</div>";

    // Variant selector
    var selector = document.getElementById("pdp-variants");
    selector.innerHTML = Render.renderVariantSelector(product);
    var curColor = v.color, curStorage = v.storage;
    var priceEl = info.querySelector(".pdp-price");

    selector.addEventListener("click", function (e) {
      var stor = e.target.closest("[data-storage]");
      if (stor) {
        curStorage = stor.getAttribute("data-storage");
        selector.querySelectorAll("[data-storage]").forEach(function (x) { x.classList.toggle("active", x === stor); });
        updateVariant();
        return;
      }
      var col = e.target.closest("[data-color]");
      if (col) {
        curColor = col.getAttribute("data-color");
        selector.querySelectorAll("[data-color]").forEach(function (x) { x.classList.toggle("active", x === col); });
        var label = selector.querySelector("[data-role=color-label]");
        if (label) label.textContent = curColor;
        updateVariant();
      }
    });

    function updateVariant() {
      var nv = Render.findVariant(product, curColor, curStorage) || first;
      priceEl.innerHTML = '<span class="now">' + NovaData.formatPrice(nv.price) + "</span>" +
        (nv.compareAtPrice ? '<span class="was">' + NovaData.formatPrice(nv.compareAtPrice) + '</span><div class="save">SAVE ' + NovaData.formatPrice(nv.compareAtPrice - nv.price) + "</div>" : "");
      if (nv.images && nv.images[0]) {
        gallery.querySelector("[data-main] img").src = NovaData.img(nv.images[0]);
      }
      var addBtn = document.getElementById("pdp-add");
      if (addBtn) addBtn.setAttribute("data-sku", nv.sku);
      var waBtn = document.getElementById("pdp-whatsapp");
      if (waBtn) waBtn.setAttribute("data-sku", nv.sku);
    }

    // Actions
    var actions = document.getElementById("pdp-actions");
    var wa = WhatsApp.numberFrom(data.settings);
    var waHref = buildWhatsAppLink(wa, WhatsApp.singleProductMessage(data.settings, product, v, 1));
    actions.innerHTML =
      '<a class="btn btn-whatsapp btn-lg" id="pdp-whatsapp" data-sku="' + v.sku + '" href="' + waHref + '" target="_blank" rel="noopener"><span class="ms">chat</span>Order on WhatsApp</a>' +
      '<button class="btn btn-lg btn-outline" id="pdp-add" data-add="' + product.slug + '" data-sku="' + v.sku + '"><span class="ms">shopping_cart</span>Add to Order List</button>' +
      '<button class="btn btn-lg btn-outline" data-wish="' + product.slug + '" data-sku="' + v.sku + '"><span class="ms">favorite</span>Add to Wishlist</button>';

    // pdp-add overrides global delegation to also re-point message? Keep simple: reuse data-add.
    document.getElementById("pdp-add").addEventListener("click", function (e) {
      e.preventDefault();
      NovaState.addToOrderList(product.slug, this.getAttribute("data-sku"), 1);
      toast("Added to your order list");
    });
    // keep whatsapp link sku updated handled in updateVariant

    // Specs
    var specs = document.getElementById("pdp-specs");
    specs.innerHTML = Render.renderSpecifications(product);

    // Trust strip
    var trust = document.getElementById("pdp-trust");
    trust.innerHTML =
      '<div class="item"><span class="ms filled">verified</span><div><h4>Authentic Product</h4><p>100% genuine with official packaging.</p></div></div>' +
      '<div class="divider"></div>' +
      '<div class="item"><span class="ms filled">security</span><div><h4>' + (product.warranty === "PLACEHOLDER" ? "Warranty" : "Warranty") + "</h4><p>" + (product.warranty === "PLACEHOLDER" ? "Terms confirmed on WhatsApp" : product.warranty) + "</p></div></div>" +
      '<div class="divider"></div>' +
      '<div class="item"><span class="ms filled">local_shipping</span><div><h4>Fast Delivery</h4><p>Nationwide delivery available.</p></div></div>';

    // Overview + in the box
    var detail = document.getElementById("pdp-detail");
    detail.innerHTML =
      '<div class="pdp-overview"><h2 class="section-title mb-3">Overview</h2>' +
      product.description.split("\n").filter(Boolean).map(function (para) { return "<p>" + para + "</p>"; }).join("") + "</div>" +
      '<div class="inbox"><h3 class="section-title mb-3">Quick Specs</h3><ul>' +
      Object.keys(product.specifications || {}).map(function (k) {
        return '<li><div class="icon"><span class="ms">info</span></div><div><strong>' + k + "</strong><div class=\"muted\">" + product.specifications[k] + "</div></div></li>";
      }).join("") + "</ul></div>";

    // Compatible accessories
    var accWrap = document.getElementById("pdp-accessories");
    if (accWrap) {
      var accs = (product.compatibleAccessories || []).map(function (id) {
        return data.allProducts.find(function (p) { return p.id === id; });
      }).filter(Boolean);
      accWrap.innerHTML = accs.length
        ? accs.map(Render.renderProductCard).join("")
        : '<p class="muted">No compatible accessories listed yet.</p>';
      refreshWishlistButtons();
    }

    // Reviews
    var revWrap = document.getElementById("pdp-reviews");
    if (revWrap) {
      var revs = data.reviews.filter(function (r) { return r.productSlug === product.slug; });
      revWrap.innerHTML = Render.renderReviews(revs);
    }

    // JSON-LD Product
    var ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      brand: { "@type": "Brand", name: product.brand },
      image: NovaData.img(first.images[0]),
      description: product.description.slice(0, 200),
      offers: { "@type": "Offer", priceCurrency: "PKR", price: v.price, availability: "https://schema.org/InStock" }
    };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);

    document.title = (product.seo && product.seo.title) || (product.name + " — " + data.settings.siteName);
    var md = document.querySelector('meta[name="description"]');
    if (md && product.seo && product.seo.description) md.setAttribute("content", product.seo.description);

    refreshWishlistButtons();
  }

  /* =================================================================
     COMPARE
     ================================================================= */
  function initCompare() {
    var wrap = document.getElementById("compare-root");
    function render() {
      var slugs = NovaState.getCompare();
      var products = slugs.map(function (s) { return data.getProduct(s); }).filter(Boolean);
      var rows = ["display", "chip", "camera", "battery", "storage"];

      if (!products.length) {
        wrap.innerHTML = '<div class="compare-empty"><span class="ms">compare_arrows</span><h3>No phones to compare.</h3><p class="muted">Add up to 4 products to compare side by side.</p><a class="btn btn-primary mt-2" href="' + BASE + 'pages/catalog.html' + '">Browse products</a></div>';
        return;
      }

      var head = '<div class="compare-controls"><span class="muted">' + products.length + ' of 4 added — add more from the catalog.</span></div>';

      var table = '<div class="compare-wrap"><table class="compare-table"><tr><th class="feature-col"></th>';
      products.forEach(function (p) {
        var v = p.variants[0];
        table += '<th class="prod-col"><div class="compare-card"><button class="remove" data-cmp-remove="' + p.slug + '" aria-label="Remove"><span class="ms sm">close</span></button>' +
          '<div class="imgbox"><img src="' + NovaData.img(v.images[0]) + '" alt="' + p.name + '" onerror="this.onerror=null;this.src=\'' + BASE + 'images/placeholder.jpg\'"></div>' +
          '<strong>' + p.name + '</strong><div class="cmp-price">' + NovaData.formatPrice(v.price) + "</div></div></th>";
      });
      table += "</tr>";
      rows.forEach(function (r) {
        table += '<tr><td class="feature-col">' + r + "</td>";
        products.forEach(function (p) {
          var val = (p.specifications && p.specifications[r]) || "—";
          table += '<td class="prod-col">' + val + "</td>";
        });
        table += "</tr>";
      });
      table += "</table>";

      // Mobile stacked
      var mob = '<div class="cmp-mobile">';
      products.forEach(function (p) {
        var v = p.variants[0];
        mob += '<div class="card"><div class="head"><div class="imgbox"><img src="' + NovaData.img(v.images[0]) + '" alt="' + p.name + '"></div>' +
          '<div style="flex:1"><strong>' + p.name + '</strong><div class="cmp-price">' + NovaData.formatPrice(v.price) + "</div></div>" +
          '<button class="remove" data-cmp-remove="' + p.slug + '" aria-label="Remove"><span class="ms">close</span></button></div>' +
          '<div class="rows">' +
          rows.map(function (r) { return '<div class="row"><span class="k">' + r + '</span><span>' + ((p.specifications && p.specifications[r]) || "—") + "</span></div>"; }).join("") +
          "</div></div>";
      });
      mob += "</div>";

      wrap.innerHTML = head + table + mob;
    }
    render();

    document.addEventListener("click", function (e) {
      var rm = e.target.closest("[data-cmp-remove]");
      if (rm) { NovaState.removeCompare(rm.getAttribute("data-cmp-remove")); render(); }
    });
    NovaState.on("compare", render);
  }

  /* =================================================================
     ORDER LIST
     ================================================================= */
  function initOrderList() {
    var wrap = document.getElementById("order-items");
    var summary = document.getElementById("order-summary");
    var empty = document.getElementById("order-empty");

    function render() {
      var items = NovaState.getOrderList();
      if (!items.length) {
        if (empty) empty.classList.remove("hidden");
        if (wrap) wrap.innerHTML = "";
        if (summary) summary.style.display = "none";
        return;
      }
      if (empty) empty.classList.add("hidden");
      if (summary) summary.style.display = "";

      var total = 0, subtotal = 0;
      var html = items.map(function (item, i) {
        var p = data.getProduct(item.slug);
        var v = (p && p.variants) ? p.variants.find(function (x) { return x.sku === item.sku; }) : null;
        var name = p ? p.name : item.slug;
        var price = v ? v.price : (p && p.variants[0] ? p.variants[0].price : 0);
        var sub = price * (item.qty || 1);
        subtotal += sub;
        var img = v && v.images ? v.images[0] : (p && p.variants && p.variants[0] && p.variants[0].images ? p.variants[0].images[0] : null);
        return '<div class="order-item" data-sku="' + item.sku + '"><div class="oi-top">' +
          '<div class="oi-img">' + (img ? '<img src="' + NovaData.img(img) + '" alt="' + name + '" onerror="this.onerror=null;this.src=\'' + BASE + 'images/placeholder.jpg\'">' : "") + "</div>" +
          '<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><h3 class="oi-title">' + name + '</h3><button class="oi-remove" data-oi-remove="' + item.sku + '" aria-label="Remove"><span class="ms">delete</span></button></div>' +
          '<div class="oi-variant">' + [v && v.storage, v && v.color].filter(Boolean).join(" • ") + "</div>" +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;flex-wrap:wrap">' +
          '<div class="qty-control"><button data-oi-dec="' + item.sku + '" aria-label="Decrease">—</button><span class="qty">' + item.qty + '</span><button data-oi-inc="' + item.sku + '" aria-label="Increase">+</button></div>' +
          '<div class="oi-price"><div class="save">' + (v && v.compareAtPrice ? "Saved " + NovaData.formatPrice(v.compareAtPrice - v.price) : "") + '</div><div class="now">' + NovaData.formatPrice(sub) + "</div></div>" +
          "</div></div></div></div>";
      }).join("");
      wrap.innerHTML = html;

      total = subtotal;
      summary.innerHTML =
        '<h2>Order Summary</h2>' +
        '<div class="row"><span>Subtotal (' + items.reduce(function (s, i) { return s + (i.qty || 1); }, 0) + ' items)</span><span class="val">' + NovaData.formatPrice(subtotal) + "</span></div>" +
        '<div class="row"><span>Estimated Delivery</span><span class="val" style="color:var(--primary)">Free</span></div>' +
        '<div class="total"><span class="lbl">Total Amount</span><span class="amt">' + NovaData.formatPrice(total) + "</span></div>" +
        '<button class="btn btn-primary btn-block" style="height:56px;font-size:16px" id="send-order">SEND ORDER ON WHATSAPP</button>' +
        '<p class="note">Final price and delivery will be confirmed on WhatsApp.</p>' +
        '<div class="security"><span><span class="ms filled">verified</span>Authentic Products</span><span><span class="ms filled">lock</span>Secure Inquiry</span></div>';

      var send = document.getElementById("send-order");
      send.addEventListener("click", function () {
        var wa = WhatsApp.numberFrom(data.settings);
        var msg = WhatsApp.orderListMessage(data.settings, items, function (s) { return data.getProduct(s); });
        window.open(buildWhatsAppLink(wa, msg), "_blank", "noopener");
      });
    }

    render();
    document.addEventListener("click", function (e) {
      var inc = e.target.closest("[data-oi-inc]");
      var dec = e.target.closest("[data-oi-dec]");
      var rm = e.target.closest("[data-oi-remove]");
      if (inc) { changeQty(inc.getAttribute("data-oi-inc"), +1); }
      else if (dec) { changeQty(dec.getAttribute("data-oi-dec"), -1); }
      else if (rm) { var item = NovaState.getOrderList().find(function (x) { return x.sku === rm.getAttribute("data-oi-remove"); }); if (item) NovaState.removeFromOrderList(item.slug, item.sku); }
    });
    NovaState.on("orderList", render);
    function changeQty(sku, d) {
      var item = NovaState.getOrderList().find(function (x) { return x.sku === sku; });
      if (item) NovaState.setQty(item.slug, item.sku, (item.qty || 1) + d);
    }
  }

  /* =================================================================
     SELL
     ================================================================= */
  function initSell() {
    var form = document.getElementById("sell-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var payload = {
        name: fd.get("name") || "",
        brand: fd.get("brand") || "",
        model: fd.get("model") || "",
        storage: fd.get("storage") || "",
        condition: fd.get("condition") || "",
        battery: fd.get("battery") || "",
        pta: fd.get("pta") || "",
        color: fd.get("color") || "",
        whatsapp: fd.get("whatsapp") || ""
      };
      var wa = WhatsApp.numberFrom(data.settings);
      var msg = WhatsApp.sellMessage(data.settings, payload);
      window.open(buildWhatsAppLink(wa, msg), "_blank", "noopener");
    });
  }

  /* =================================================================
     SEARCH
     ================================================================= */
  function initSearch() {
    var url = new URLSearchParams(window.location.search);
    var q = (url.get("q") || "").trim();
    var input = document.getElementById("search-query");
    var grid = document.getElementById("search-grid");
    var info = document.getElementById("search-info");

    if (input) {
      input.value = q;
      var timer;
      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          run(qInput());
        }, 250);
      });
    }
    function qInput() { return (input ? input.value : q).trim(); }

    function run(term) {
      var results = [];
      if (term) {
        var t = term.toLowerCase();
        results = data.allProducts.filter(function (p) {
          var hay = [p.name, p.brand, p.condition, (p.keywords || []).join(" ")].join(" ").toLowerCase();
          return hay.indexOf(t) >= 0;
        });
      }
      if (info) info.textContent = term ? results.length + " result(s) for \u201C" + term + "\u201D" : "Start typing to search phones and accessories.";
      if (!grid) return;
      if (!results.length) {
        grid.innerHTML = '<div class="no-results" style="grid-column:1/-1"><span class="ms">search_off</span><h3>No results found.</h3><p class="muted">Try a different search.</p></div>';
      } else {
        grid.innerHTML = results.map(Render.renderProductCard).join("");
      }
      refreshWishlistButtons();
    }
    run(q);
  }

  /* =================================================================
     WISHLIST
     ================================================================= */
  function initWishlist() {
    var grid = document.getElementById("wishlist-grid");
    var empty = document.getElementById("wishlist-empty");
    function render() {
      var items = NovaState.getWishlist();
      var products = items.map(function (i) {
        var p = data.getProduct(i.slug);
        return p ? p : null;
      }).filter(Boolean);
      if (empty) empty.classList.toggle("hidden", products.length > 0);
      if (!grid) return;
      if (!products.length) { grid.innerHTML = ""; return; }
      grid.innerHTML = products.map(Render.renderProductCard).join("");
      refreshWishlistButtons();
    }
    render();
    NovaState.on("wishlist", render);
  }

  /* =================================================================
     BOOT
     ================================================================= */
  function boot() {
    NovaData.loadAll().then(function (d) {
      data = d;

      // Footer
      var footerHost = document.getElementById("footer-host");
      if (footerHost) footerHost.innerHTML = Render.renderFooter(d.settings);

      // Static pages already carry their own <title>/<meta> in the HTML shell
      // (for SEO). Only product pages get their per-product seo.title injected
      // inside initProduct, and the JSON-LD Product block is added there too.
      wireSearch();
      wireGlobalEvents();
      refreshWishlistButtons();

      var init = {
        home: initHome,
        catalog: initCatalog,
        product: initProduct,
        compare: initCompare,
        "order-list": initOrderList,
        sell: initSell,
        search: initSearch,
        wishlist: initWishlist
      }[page];
      if (init) init();
    }).catch(function (err) {
      console.error(err);
      var root = document.querySelector("main");
      if (root) root.innerHTML = '<div class="loading"><p>Could not load content. If you opened this file directly (file://), please serve it with a local server — see the README.</p></div>';
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
