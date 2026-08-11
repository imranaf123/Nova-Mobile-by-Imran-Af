/* Nova Mobile — state.js
   Thin localStorage wrapper for client-side state (wishlist, compare,
   order list, recently viewed). No sensitive data is ever stored here. */
(function () {
  "use strict";

  var KEYS = {
    wishlist: "nova_wishlist",        // array of {slug, sku}
    compare: "nova_compare",          // array of slugs (max 4)
    orderList: "nova_order_list",     // array of {slug, sku, qty}
    recentlyViewed: "nova_recently_viewed" // array of slugs
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn("[Nova] Could not persist state", e);
    }
  }

  var State = {
    /* ---------------- Wishlist ---------------- */
    getWishlist: function () { return read(KEYS.wishlist, []); },
    inWishlist: function (slug, sku) {
      return this.getWishlist().some(function (i) { return i.slug === slug && i.sku === sku; });
    },
    toggleWishlist: function (slug, sku) {
      var list = this.getWishlist();
      var idx = list.findIndex(function (i) { return i.slug === slug && i.sku === sku; });
      var added = false;
      if (idx >= 0) { list.splice(idx, 1); } else { list.push({ slug: slug, sku: sku }); added = true; }
      write(KEYS.wishlist, list);
      this.emit("wishlist");
      return added;
    },
    removeWishlist: function (slug, sku) {
      write(KEYS.wishlist, this.getWishlist().filter(function (i) { return !(i.slug === slug && i.sku === sku); }));
      this.emit("wishlist");
    },

    /* ---------------- Compare (max 4) ---------------- */
    getCompare: function () { return read(KEYS.compare, []); },
    inCompare: function (slug) { return this.getCompare().indexOf(slug) >= 0; },
    toggleCompare: function (slug) {
      var list = this.getCompare();
      var idx = list.indexOf(slug);
      var added = false;
      if (idx >= 0) { list.splice(idx, 1); }
      else if (list.length < 4) { list.push(slug); added = true; }
      else { this.emit("compare:full"); return false; }
      write(KEYS.compare, list);
      this.emit("compare");
      return added;
    },
    removeCompare: function (slug) {
      write(KEYS.compare, this.getCompare().filter(function (s) { return s !== slug; }));
      this.emit("compare");
    },

    /* ---------------- Order list (cart) ---------------- */
    getOrderList: function () { return read(KEYS.orderList, []); },
    addToOrderList: function (slug, sku, qty) {
      var list = this.getOrderList();
      var idx = list.findIndex(function (i) { return i.slug === slug && i.sku === sku; });
      if (idx >= 0) { list[idx].qty = (list[idx].qty || 1) + (qty || 1); }
      else { list.push({ slug: slug, sku: sku, qty: qty || 1 }); }
      write(KEYS.orderList, list);
      this.emit("orderList");
    },
    setQty: function (slug, sku, qty) {
      var list = this.getOrderList();
      var idx = list.findIndex(function (i) { return i.slug === slug && i.sku === sku; });
      if (idx < 0) return;
      if (qty <= 0) { list.splice(idx, 1); }
      else { list[idx].qty = qty; }
      write(KEYS.orderList, list);
      this.emit("orderList");
    },
    removeFromOrderList: function (slug, sku) {
      write(KEYS.orderList, this.getOrderList().filter(function (i) { return !(i.slug === slug && i.sku === sku); }));
      this.emit("orderList");
    },
    clearOrderList: function () { write(KEYS.orderList, []); this.emit("orderList"); },
    orderCount: function () {
      return this.getOrderList().reduce(function (s, i) { return s + (i.qty || 1); }, 0);
    },

    /* ---------------- Recently viewed ---------------- */
    getRecentlyViewed: function () { return read(KEYS.recentlyViewed, []); },
    addRecentlyViewed: function (slug) {
      var list = this.getRecentlyViewed().filter(function (s) { return s !== slug; });
      list.unshift(slug);
      write(KEYS.recentlyViewed, list.slice(0, 12));
    },

    /* ---------------- Events ---------------- */
    _handlers: {},
    on: function (evt, fn) { (this._handlers[evt] = this._handlers[evt] || []).push(fn); },
    emit: function (evt) {
      (this._handlers[evt] || []).forEach(function (fn) { fn(); });
    }
  };

  // Keep badge counts in the header/nav in sync.
  State.on("orderList", function () {
    var total = State.orderCount();
    document.querySelectorAll("[data-order-count]").forEach(function (el) {
      el.textContent = total;
      el.style.display = total > 0 ? "" : "none";
    });
  });

  window.NovaState = State;
})();
