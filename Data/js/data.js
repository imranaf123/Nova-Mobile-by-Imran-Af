/* Nova Mobile — data.js
   Fetches and caches all data/*.json files in memory per session.
   Also exposes shared helpers (base-path resolution, price formatting). */
(function () {
  "use strict";

  // Resolve the base path so fetch() + images work from both the root
  // (index.html) and the /pages/ subfolder on a plain static host.
  var NOVA_BASE = /\/pages\//.test(window.location.pathname) ? "../" : "";

  var FILES = ["settings", "mobiles", "accessories", "brands", "categories", "reviews"];
  var cache = null;
  var loading = null;

  function loadAll() {
    if (cache) return Promise.resolve(cache);
    if (loading) return loading;
    loading = Promise.all(
      FILES.map(function (f) {
        return fetch(NOVA_BASE + "data/" + f + ".json")
          .then(function (r) {
            if (!r.ok) throw new Error("Could not load " + f + ".json");
            return r.json();
          })
          .catch(function () {
            // Fail soft: return empty so the page still renders.
            console.warn("[Nova] Failed to load " + f + ".json");
            return [];
          });
      })
    ).then(function (arr) {
      cache = {
        settings: arr[0] || {},
        mobiles: arr[1] || [],
        accessories: arr[2] || [],
        brands: arr[3] || [],
        categories: arr[4] || [],
        reviews: arr[5] || []
      };
      cache.allProducts = cache.mobiles.concat(cache.accessories);
      cache.getProduct = function (slug) {
        return cache.allProducts.find(function (p) { return p.slug === slug; });
      };
      return cache;
    });
    return loading;
  }

  // Format a PKR price like "Rs 349,999".
  function formatPrice(n) {
    if (typeof n !== "number") return "Rs 0";
    return "Rs " + n.toLocaleString("en-US");
  }

  // Resolve an image path stored in JSON (root-relative) to the current page.
  function img(path) {
    if (!path) return NOVA_BASE + "images/placeholder.jpg";
    return NOVA_BASE + path;
  }

  // Domain URL helpers for JSON-LD / sitemap links.
  function siteUrl(page) {
    var base = (window.location.origin || "") + NOVA_BASE;
    return base + page;
  }

  window.NOVA_BASE = NOVA_BASE;
  window.NovaData = { loadAll: loadAll, formatPrice: formatPrice, img: img, siteUrl: siteUrl };
})();
